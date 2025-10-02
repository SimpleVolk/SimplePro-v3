import { Controller, Get, Post, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DatabasePerformanceService } from '../database/database-performance.service';
import { CacheService } from '../cache/cache.service';
import { IndexOptimizationService } from '../database/index-optimization.service';

@Controller('admin/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
export class PerformanceMonitorController {
  constructor(
    private readonly dbPerformanceService: DatabasePerformanceService,
    private readonly cacheService: CacheService,
    private readonly indexService: IndexOptimizationService
  ) {}

  @Get('database/health')
  async getDatabaseHealth() {
    return {
      success: true,
      data: await this.dbPerformanceService.getConnectionHealth()
    };
  }

  @Get('database/stats')
  async getDatabaseStats() {
    return {
      success: true,
      data: await this.dbPerformanceService.getPerformanceStats()
    };
  }

  @Get('database/slow-queries')
  async getSlowQueries(@Query('threshold') threshold?: string) {
    const thresholdMs = threshold ? parseInt(threshold, 10) : 100;
    return {
      success: true,
      data: this.dbPerformanceService.getSlowQueries(thresholdMs)
    };
  }

  @Get('cache/stats')
  async getCacheStats() {
    return {
      success: true,
      data: this.cacheService.getStats()
    };
  }

  @Post('cache/clear')
  async clearCache(@Query('type') type?: string) {
    switch (type) {
      case 'users':
        await this.cacheService.clearUserCaches();
        break;
      case 'jobs':
        await this.cacheService.clearJobCaches();
        break;
      case 'customers':
        await this.cacheService.clearCustomerCaches();
        break;
      case 'analytics':
        await this.cacheService.clearAnalyticsCaches();
        break;
      case 'all':
        await this.cacheService.clearAllCaches();
        break;
      default:
        return {
          success: false,
          error: 'Invalid cache type. Use: users, jobs, customers, analytics, or all'
        };
    }

    return {
      success: true,
      message: `${type || 'specified'} cache cleared successfully`
    };
  }

  @Post('cache/stats/reset')
  async resetCacheStats() {
    this.cacheService.resetStats();
    return {
      success: true,
      message: 'Cache statistics reset successfully'
    };
  }

  @Get('indexes/usage')
  async getIndexUsage() {
    return {
      success: true,
      data: await this.indexService.analyzeIndexUsage()
    };
  }

  @Get('indexes/unused')
  async getUnusedIndexes() {
    return {
      success: true,
      data: await this.indexService.getUnusedIndexes()
    };
  }

  @Delete('indexes/unused')
  async dropUnusedIndexes(@Query('dryRun') dryRun?: string) {
    const isDryRun = dryRun !== 'false';
    return {
      success: true,
      data: await this.indexService.dropUnusedIndexes(isDryRun),
      dryRun: isDryRun
    };
  }

  @Get('metrics/summary')
  async getPerformanceSummary() {
    const [dbHealth, dbStats, cacheStats, indexUsage] = await Promise.all([
      this.dbPerformanceService.getConnectionHealth(),
      this.dbPerformanceService.getPerformanceStats(),
      this.cacheService.getStats(),
      this.indexService.analyzeIndexUsage()
    ]);

    const slowQueries = this.dbPerformanceService.getSlowQueries(100);

    // Calculate index efficiency
    const totalIndexes: number = Object.values(indexUsage).reduce(
      (total: number, collection: any) => total + collection.length,
      0
    );

    const usedIndexes: number = Object.values(indexUsage).reduce(
      (used: number, collection: any) =>
        used + collection.filter((index: any) => index.usageCount > 0).length,
      0
    );

    const indexEfficiency: number = totalIndexes > 0 ? (usedIndexes / totalIndexes) * 100 : 0;

    return {
      success: true,
      data: {
        database: {
          status: dbHealth.status,
          connections: dbHealth.connections,
          uptime: dbHealth.uptime,
          averageQueryTime: dbStats.averageQueryTime,
          slowQueryCount: dbStats.slowQueryCount,
          totalQueries: dbStats.totalQueries
        },
        cache: {
          hitRate: cacheStats.hitRate,
          totalHits: cacheStats.hits,
          totalMisses: cacheStats.misses,
          totalSets: cacheStats.sets
        },
        indexes: {
          total: totalIndexes,
          used: usedIndexes,
          efficiency: Math.round(indexEfficiency * 100) / 100
        },
        alerts: this.generatePerformanceAlerts(dbStats, cacheStats, slowQueries)
      }
    };
  }

  @Delete('metrics/clear')
  async clearMetrics() {
    this.dbPerformanceService.clearQueryMetrics();
    this.cacheService.resetStats();

    return {
      success: true,
      message: 'All performance metrics cleared successfully'
    };
  }

  private generatePerformanceAlerts(dbStats: any, cacheStats: any, slowQueries: any[]): string[] {
    const alerts: string[] = [];

    // Database performance alerts
    if (dbStats.averageQueryTime > 500) {
      alerts.push(`High average query time: ${Math.round(dbStats.averageQueryTime)}ms`);
    }

    if (dbStats.slowQueryCount > 50) {
      alerts.push(`High number of slow queries: ${dbStats.slowQueryCount}`);
    }

    // Cache performance alerts
    if (cacheStats.hitRate < 80 && cacheStats.hits + cacheStats.misses > 100) {
      alerts.push(`Low cache hit rate: ${Math.round(cacheStats.hitRate)}%`);
    }

    // Recent slow query alerts
    const recentSlowQueries = slowQueries.filter(
      query => Date.now() - new Date(query.timestamp || 0).getTime() < 300000 // Last 5 minutes
    );

    if (recentSlowQueries.length > 10) {
      alerts.push(`${recentSlowQueries.length} slow queries in the last 5 minutes`);
    }

    // Memory and performance recommendations
    if (alerts.length === 0) {
      alerts.push('System performance is optimal');
    }

    return alerts;
  }
}