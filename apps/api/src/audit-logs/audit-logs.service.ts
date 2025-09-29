import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import {
  CreateAuditLogDto,
  AuditLogContext,
  AuditSeverity,
  AuditOutcome
} from './dto/create-audit-log.dto';
import { QueryAuditLogDto, ExportFormat } from './dto/query-audit-log.dto';

/**
 * Service for managing audit logs
 *
 * Provides comprehensive audit logging functionality including:
 * - Creating immutable audit log entries
 * - Querying logs with advanced filtering
 * - Exporting logs in multiple formats
 * - Automatic cleanup via TTL indexes
 */
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Create a new audit log entry
   *
   * @param createAuditLogDto - Audit log data
   * @returns Created audit log
   */
  async createLog(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = new this.auditLogModel({
        ...createAuditLogDto,
        timestamp: createAuditLogDto.timestamp || new Date(),
      });

      const savedLog = await auditLog.save();

      // Log to console for monitoring systems
      this.logger.log(
        `[AUDIT] ${createAuditLogDto.action} by ${createAuditLogDto.userName} (${createAuditLogDto.userId}) - ${createAuditLogDto.outcome}`
      );

      return savedLog.toObject();
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - we don't want audit logging failures to break business logic
      // But log the error for monitoring
      return {} as AuditLog;
    }
  }

  /**
   * Convenient method to log an action
   *
   * @param context - User context information
   * @param action - Action being performed
   * @param resource - Resource being acted upon
   * @param options - Additional logging options
   */
  async log(
    context: AuditLogContext,
    action: string,
    resource: string,
    options?: {
      resourceId?: string;
      severity?: AuditSeverity;
      outcome?: AuditOutcome;
      changes?: { before?: any; after?: any };
      metadata?: Record<string, any>;
      errorMessage?: string;
      errorStack?: string;
    }
  ): Promise<AuditLog> {
    return this.createLog({
      userId: context.userId,
      userName: context.userName,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      action,
      resource,
      resourceId: options?.resourceId,
      severity: options?.severity || 'info',
      outcome: options?.outcome || 'success',
      changes: options?.changes,
      metadata: options?.metadata,
      errorMessage: options?.errorMessage,
      errorStack: options?.errorStack,
    });
  }

  /**
   * Find all audit logs with optional filtering
   *
   * @param query - Query parameters
   * @returns Array of audit logs and total count
   */
  async findAll(
    query: QueryAuditLogDto
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const filter: FilterQuery<AuditLogDocument> = {};

    // Date range filter
    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        filter.timestamp.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.timestamp.$lte = query.endDate;
      }
    }

    // User filters
    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.userName) {
      filter.userName = new RegExp(query.userName, 'i');
    }

    // Action and resource filters
    if (query.action) {
      filter.action = query.action;
    }

    if (query.resource) {
      filter.resource = query.resource;
    }

    if (query.resourceId) {
      filter.resourceId = query.resourceId;
    }

    // Severity filter
    if (query.severity) {
      filter.severity = query.severity;
    }

    // Outcome filter
    if (query.outcome) {
      filter.outcome = query.outcome;
    }

    // IP Address filter
    if (query.ipAddress) {
      filter.ipAddress = query.ipAddress;
    }

    // Session ID filter
    if (query.sessionId) {
      filter.sessionId = query.sessionId;
    }

    // Search filter (searches across userName, action, resource)
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { userName: searchRegex },
        { action: searchRegex },
        { resource: searchRegex },
      ];
    }

    // Get total count
    const total = await this.auditLogModel.countDocuments(filter);

    // Get logs with pagination and sorting
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy || 'timestamp';

    const logs = await this.auditLogModel
      .find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(query.skip || 0)
      .limit(query.limit || 50)
      .lean()
      .exec();

    return { logs, total };
  }

  /**
   * Find a specific audit log by ID
   *
   * @param id - Audit log ID
   * @returns Audit log
   */
  async findById(id: string): Promise<AuditLog> {
    const log = await this.auditLogModel.findById(id).lean().exec();

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  /**
   * Get audit logs for a specific user
   *
   * @param userId - User ID
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findByUserId(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Get audit logs for a specific resource
   *
   * @param resource - Resource type
   * @param resourceId - Resource ID
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findByResource(
    resource: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.auditLogModel
      .find({ resource, resourceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Export audit logs in specified format
   *
   * @param query - Query parameters
   * @param format - Export format (json or csv)
   * @returns Exported data as string
   */
  async export(query: QueryAuditLogDto, format: ExportFormat): Promise<string> {
    const { logs } = await this.findAll({ ...query, limit: 10000 }); // Max 10k for export

    if (format === 'csv') {
      return this.exportToCsv(logs);
    } else {
      return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Convert logs to CSV format
   *
   * @param logs - Array of audit logs
   * @returns CSV string
   */
  private exportToCsv(logs: AuditLog[]): string {
    const headers = [
      'Timestamp',
      'User ID',
      'User Name',
      'Action',
      'Resource',
      'Resource ID',
      'Severity',
      'Outcome',
      'IP Address',
      'User Agent',
      'Error Message',
    ];

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.userId,
      log.userName,
      log.action,
      log.resource,
      log.resourceId || '',
      log.severity,
      log.outcome,
      log.ipAddress,
      log.userAgent || '',
      log.errorMessage || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  }

  /**
   * Get available action types from the database
   *
   * @returns Array of unique action types
   */
  async getActionTypes(): Promise<string[]> {
    const actions = await this.auditLogModel.distinct('action').exec();
    return actions.sort();
  }

  /**
   * Get available resource types from the database
   *
   * @returns Array of unique resource types
   */
  async getResourceTypes(): Promise<string[]> {
    const resources = await this.auditLogModel.distinct('resource').exec();
    return resources.sort();
  }

  /**
   * Get statistics about audit logs
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<{
    total: number;
    byOutcome: Record<string, number>;
    bySeverity: Record<string, number>;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    recentActivity: AuditLog[];
  }> {
    const total = await this.auditLogModel.countDocuments();

    const byOutcome = await this.auditLogModel.aggregate([
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ]);

    const bySeverity = await this.auditLogModel.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const byAction = await this.auditLogModel.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const byResource = await this.auditLogModel.aggregate([
      { $group: { _id: '$resource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const recentActivity = await this.auditLogModel
      .find()
      .sort({ timestamp: -1 })
      .limit(10)
      .lean()
      .exec();

    return {
      total,
      byOutcome: Object.fromEntries(byOutcome.map(item => [item._id, item.count])),
      bySeverity: Object.fromEntries(bySeverity.map(item => [item._id, item.count])),
      byAction: Object.fromEntries(byAction.map(item => [item._id, item.count])),
      byResource: Object.fromEntries(byResource.map(item => [item._id, item.count])),
      recentActivity,
    };
  }

  /**
   * Manually cleanup old logs (only for emergency use, TTL handles this automatically)
   *
   * @param daysOld - Delete logs older than this many days
   * @returns Number of deleted logs
   */
  async cleanup(daysOld: number = 90): Promise<number> {
    this.logger.warn(`Manually cleaning up audit logs older than ${daysOld} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.auditLogModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    this.logger.log(`Deleted ${result.deletedCount} old audit logs`);
    return result.deletedCount || 0;
  }
}