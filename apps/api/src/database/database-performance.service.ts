import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface QueryMetrics {
  query: string;
  duration: number;
  collection: string;
  operation: string;
  documentCount?: number;
  indexesUsed?: string[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class DatabasePerformanceService {
  private readonly logger = new Logger(DatabasePerformanceService.name);
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(@InjectConnection() private connection: Connection) {
    this.setupQueryLogging();
  }

  private setupQueryLogging(): void {
    // Enable MongoDB query logging for performance monitoring
    this.connection.set(
      'debug',
      (collection: string, method: string, query: any, _doc?: any) => {
        const startTime = Date.now();

        // Log slow queries (> 100ms)
        setTimeout(() => {
          const duration = Date.now() - startTime;
          if (duration > 100) {
            this.logger.warn(
              `Slow query detected: ${collection}.${method} took ${duration}ms`,
              {
                collection,
                method,
                query: JSON.stringify(query),
                duration,
              },
            );
          }
        }, 0);
      },
    );
  }

  async logQueryMetrics(metrics: QueryMetrics): Promise<void> {
    this.queryMetrics.push(metrics);

    // Keep only the last N metrics to prevent memory leaks
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.shift();
    }

    // Log slow queries
    if (metrics.duration > 100) {
      this.logger.warn(
        `Slow query: ${metrics.operation} on ${metrics.collection} took ${metrics.duration}ms`,
      );
    }
  }

  getQueryMetrics(): QueryMetrics[] {
    return [...this.queryMetrics];
  }

  clearQueryMetrics(): void {
    this.queryMetrics = [];
  }

  getSlowQueries(threshold = 100): QueryMetrics[] {
    return this.queryMetrics.filter((metric) => metric.duration > threshold);
  }

  async analyzeIndexUsage(collection: string): Promise<any> {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      const stats = await db
        .collection(collection)
        .aggregate([{ $indexStats: {} }])
        .toArray();

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to analyze index usage for ${collection}:`,
        error,
      );
      return [];
    }
  }

  async explainQuery(collection: string, query: any): Promise<any> {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      const explanation = await db
        .collection(collection)
        .find(query)
        .explain('executionStats');
      return explanation;
    } catch (error) {
      this.logger.error(`Failed to explain query for ${collection}:`, error);
      return null;
    }
  }

  // Helper method for consistent pagination across all services
  static createPaginationPipeline(options: PaginationOptions): any[] {
    const { page, limit, sort = { _id: -1 } } = options;
    const skip = (page - 1) * limit;

    return [
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          count: [{ $count: 'total' }],
        },
      },
      {
        $project: {
          data: 1,
          total: { $arrayElemAt: ['$count.total', 0] },
        },
      },
    ];
  }

  static formatPaginatedResult<T>(
    result: any[],
    options: PaginationOptions,
  ): PaginatedResult<T> {
    const { page, limit } = options;
    const data = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  // Connection health monitoring
  async getConnectionHealth(): Promise<{
    status: string;
    connections: number;
    uptime: number;
    host: string;
    version: string;
  }> {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      const adminDb = db.admin();
      const serverStatus = await adminDb.serverStatus();

      return {
        status: this.connection.readyState === 1 ? 'connected' : 'disconnected',
        connections: serverStatus?.connections?.current || 0,
        uptime: serverStatus?.uptime || 0,
        host: serverStatus?.host || 'unknown',
        version: serverStatus?.version || 'unknown',
      };
    } catch (error) {
      this.logger.error('Failed to get connection health:', error);
      return {
        status: 'error',
        connections: 0,
        uptime: 0,
        host: 'unknown',
        version: 'unknown',
      };
    }
  }

  // Performance statistics
  async getPerformanceStats(): Promise<{
    averageQueryTime: number;
    slowQueryCount: number;
    totalQueries: number;
    topSlowQueries: QueryMetrics[];
  }> {
    const totalQueries = this.queryMetrics.length;
    const slowQueries = this.getSlowQueries();
    const averageQueryTime =
      totalQueries > 0
        ? this.queryMetrics.reduce((sum, metric) => sum + metric.duration, 0) /
          totalQueries
        : 0;

    const topSlowQueries = slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      averageQueryTime,
      slowQueryCount: slowQueries.length,
      totalQueries,
      topSlowQueries,
    };
  }
}
