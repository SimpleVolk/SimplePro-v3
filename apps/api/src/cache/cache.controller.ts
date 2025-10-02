import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheMetricsService } from './cache-metrics.service';
import { CacheWarmerService } from './cache-warmer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * CacheController - Expose cache management and monitoring endpoints
 *
 * Endpoints:
 * - GET /cache/stats - Cache statistics
 * - GET /cache/metrics - Prometheus metrics
 * - GET /cache/health - Health check
 * - POST /cache/clear - Clear all caches (admin only)
 * - POST /cache/warm - Warm caches manually (admin only)
 */
@Controller('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CacheController {
  constructor(
    private cacheService: CacheService,
    private cacheMetricsService: CacheMetricsService,
    private cacheWarmerService: CacheWarmerService,
  ) {}

  /**
   * Get cache statistics
   */
  @Get('stats')
  @Roles('admin', 'super_admin')
  getStats() {
    const stats = this.cacheService.getStats();
    const isConnected = this.cacheService.isConnected();

    return {
      ...stats,
      isConnected,
      backend: isConnected ? 'redis' : 'memory',
    };
  }

  /**
   * Get detailed metrics
   */
  @Get('metrics')
  @Roles('admin', 'super_admin')
  getMetrics() {
    return this.cacheMetricsService.getMetrics();
  }

  /**
   * Get Prometheus-formatted metrics
   */
  @Get('metrics/prometheus')
  @Roles('admin', 'super_admin')
  getPrometheusMetrics() {
    return this.cacheMetricsService.getPrometheusMetrics();
  }

  /**
   * Get cache health status
   */
  @Get('health')
  getHealth() {
    return this.cacheMetricsService.getHealthStatus();
  }

  /**
   * Get cache warming status
   */
  @Get('warming/status')
  @Roles('admin', 'super_admin')
  async getWarmingStatus() {
    return await this.cacheWarmerService.getWarmingStatus();
  }

  /**
   * Clear all caches (admin only)
   */
  @Post('clear')
  @Roles('admin', 'super_admin')
  async clearCache() {
    await this.cacheService.clear();
    return { message: 'Cache cleared successfully' };
  }

  /**
   * Clear specific domain caches
   */
  @Delete('customers')
  @Roles('admin', 'super_admin')
  async clearCustomerCache() {
    await this.cacheService.clearCustomerCaches();
    return { message: 'Customer caches cleared' };
  }

  @Delete('jobs')
  @Roles('admin', 'super_admin')
  async clearJobCache() {
    await this.cacheService.clearJobCaches();
    return { message: 'Job caches cleared' };
  }

  @Delete('analytics')
  @Roles('admin', 'super_admin')
  async clearAnalyticsCache() {
    await this.cacheService.clearAnalyticsCaches();
    return { message: 'Analytics caches cleared' };
  }

  /**
   * Warm caches manually
   */
  @Post('warm')
  @Roles('admin', 'super_admin')
  async warmCaches() {
    await this.cacheWarmerService.warmCaches();
    return { message: 'Cache warming initiated' };
  }

  /**
   * Reset metrics
   */
  @Post('metrics/reset')
  @Roles('admin', 'super_admin')
  resetMetrics() {
    this.cacheMetricsService.resetMetrics();
    return { message: 'Cache metrics reset' };
  }
}
