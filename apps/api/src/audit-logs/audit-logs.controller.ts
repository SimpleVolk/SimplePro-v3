import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto, ExportFormat } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/interfaces/user.interface';

/**
 * Audit Logs Controller
 *
 * Provides REST API endpoints for audit log management.
 * All endpoints require authentication and admin/super_admin roles.
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Get audit logs with filtering and pagination
   *
   * @param query - Query parameters for filtering
   * @returns Paginated audit logs
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(@Query() query: QueryAuditLogDto) {
    // Convert string query parameters to proper types
    const queryDto: QueryAuditLogDto = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? parseInt(String(query.limit)) : 50,
      skip: query.skip ? parseInt(String(query.skip)) : 0,
    };

    const { logs, total } = await this.auditLogsService.findAll(queryDto);

    return {
      success: true,
      data: logs,
      pagination: {
        total,
        limit: queryDto.limit,
        skip: queryDto.skip,
        pages: Math.ceil(total / (queryDto.limit || 50)),
      },
    };
  }

  /**
   * Get a specific audit log by ID
   *
   * @param id - Audit log ID
   * @returns Single audit log
   */
  @Get(':id')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string) {
    const log = await this.auditLogsService.findById(id);

    return {
      success: true,
      data: log,
    };
  }

  /**
   * Create a new audit log entry
   * (Internal use - typically called by the system, not manually)
   *
   * @param createAuditLogDto - Audit log data
   * @param user - Current user
   * @returns Created audit log
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async create(
    @Body() createAuditLogDto: CreateAuditLogDto,
    @CurrentUser() user: User,
    @Req() req: any
  ) {
    // Override user information from token if not provided
    const auditLogData: CreateAuditLogDto = {
      ...createAuditLogDto,
      userId: createAuditLogDto.userId || user.id,
      userName: createAuditLogDto.userName || `${user.firstName} ${user.lastName}`,
      ipAddress: createAuditLogDto.ipAddress || req.ip || 'unknown',
      userAgent: createAuditLogDto.userAgent || req.headers['user-agent'],
    };

    const log = await this.auditLogsService.createLog(auditLogData);

    return {
      success: true,
      data: log,
      message: 'Audit log created successfully',
    };
  }

  /**
   * Export audit logs in specified format
   *
   * @param query - Query parameters for filtering
   * @param format - Export format (json or csv)
   * @param res - Express response object
   * @returns File download
   */
  @Get('export/:format')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Limited - exports are expensive
  async export(
    @Query() query: QueryAuditLogDto,
    @Param('format') format: ExportFormat,
    @Res({ passthrough: true }) res: Response
  ) {
    // Validate format
    if (format !== 'json' && format !== 'csv') {
      return {
        success: false,
        error: 'Invalid format. Must be json or csv',
      };
    }

    // Convert query parameters
    const queryDto: QueryAuditLogDto = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const exportData = await this.auditLogsService.export(queryDto, format);

    // Set appropriate headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `audit-logs-${timestamp}.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return exportData;
  }

  /**
   * Get available action types
   *
   * @returns List of unique action types
   */
  @Get('metadata/actions')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getActions() {
    const actions = await this.auditLogsService.getActionTypes();

    return {
      success: true,
      data: actions,
      count: actions.length,
    };
  }

  /**
   * Get available resource types
   *
   * @returns List of unique resource types
   */
  @Get('metadata/resources')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getResources() {
    const resources = await this.auditLogsService.getResourceTypes();

    return {
      success: true,
      data: resources,
      count: resources.length,
    };
  }

  /**
   * Get audit log statistics
   *
   * @returns Statistics about audit logs
   */
  @Get('metadata/statistics')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStatistics() {
    const stats = await this.auditLogsService.getStatistics();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get audit logs for a specific user
   *
   * @param userId - User ID
   * @param limit - Maximum number of logs to return
   * @returns User's audit logs
   */
  @Get('user/:userId')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getUserLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: string
  ) {
    const logs = await this.auditLogsService.findByUserId(
      userId,
      limit ? parseInt(limit) : 100
    );

    return {
      success: true,
      data: logs,
      count: logs.length,
    };
  }

  /**
   * Get audit logs for a specific resource
   *
   * @param resource - Resource type
   * @param resourceId - Resource ID
   * @param limit - Maximum number of logs to return
   * @returns Resource's audit logs
   */
  @Get('resource/:resource/:resourceId')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getResourceLogs(
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: string
  ) {
    const logs = await this.auditLogsService.findByResource(
      resource,
      resourceId,
      limit ? parseInt(limit) : 100
    );

    return {
      success: true,
      data: logs,
      count: logs.length,
    };
  }

  /**
   * Manually cleanup old audit logs
   * (Emergency use only - TTL handles this automatically)
   *
   * @param daysOld - Delete logs older than this many days
   * @returns Number of deleted logs
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin') // Only super admin can manually cleanup
  @Throttle({ default: { limit: 1, ttl: 3600000 } }) // 1 per hour
  async cleanup(@Query('daysOld') daysOld?: string) {
    const days = daysOld ? parseInt(daysOld) : 90;
    const deletedCount = await this.auditLogsService.cleanup(days);

    return {
      success: true,
      data: {
        deletedCount,
        daysOld: days,
      },
      message: `Deleted ${deletedCount} audit logs older than ${days} days`,
    };
  }
}