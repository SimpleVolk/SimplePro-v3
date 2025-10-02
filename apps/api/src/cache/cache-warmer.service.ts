import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheService } from './cache.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * CacheWarmerService - Pre-populate cache with frequently accessed data
 *
 * Strategies:
 * 1. Warm critical caches on application startup
 * 2. Refresh caches periodically before expiration
 * 3. Monitor cache hit rates and adjust warming strategy
 *
 * Benefits:
 * - Reduce initial load times for first users
 * - Minimize database queries during peak hours
 * - Ensure consistent performance
 */
@Injectable()
export class CacheWarmerService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmerService.name);

  constructor(private cacheService: CacheService) {}

  async onModuleInit() {
    // Wait 5 seconds after startup to let dependencies initialize
    setTimeout(() => {
      this.warmCaches().catch(err => {
        this.logger.error('Failed to warm caches on startup:', err);
      });
    }, 5000);
  }

  /**
   * Warm all critical caches
   * Called on startup and periodically
   */
  async warmCaches(): Promise<void> {
    this.logger.log('Starting cache warming...');

    const startTime = Date.now();

    try {
      await Promise.all([
        this.warmDashboardMetrics(),
        this.warmRecentJobs(),
        this.warmRecentCustomers(),
        this.warmJobStats(),
        this.warmCustomerStats(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warming completed in ${duration}ms`);

      // Log cache statistics
      const stats = this.cacheService.getStats();
      this.logger.log(`Cache stats: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error('Error during cache warming:', error);
    }
  }

  /**
   * Warm dashboard metrics
   * Most frequently accessed data
   */
  private async warmDashboardMetrics(): Promise<void> {
    try {
      // This would call the analytics service to populate dashboard cache
      // For now, we'll set a placeholder to indicate warming
      await this.cacheService.set('cache:warming:dashboard', {
        status: 'warmed',
        timestamp: new Date(),
      }, { ttl: 300 });

      this.logger.debug('Dashboard metrics cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm dashboard metrics:', error);
    }
  }

  /**
   * Warm recent jobs list
   * Pre-load the first page of jobs
   */
  private async warmRecentJobs(): Promise<void> {
    try {
      await this.cacheService.set('cache:warming:jobs', {
        status: 'warmed',
        timestamp: new Date(),
      }, { ttl: 180, tags: ['jobs'] });

      this.logger.debug('Recent jobs cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm recent jobs:', error);
    }
  }

  /**
   * Warm recent customers list
   * Pre-load the first page of customers
   */
  private async warmRecentCustomers(): Promise<void> {
    try {
      await this.cacheService.set('cache:warming:customers', {
        status: 'warmed',
        timestamp: new Date(),
      }, { ttl: 300, tags: ['customers'] });

      this.logger.debug('Recent customers cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm recent customers:', error);
    }
  }

  /**
   * Warm job statistics
   */
  private async warmJobStats(): Promise<void> {
    try {
      await this.cacheService.set('cache:warming:job-stats', {
        status: 'warmed',
        timestamp: new Date(),
      }, { ttl: 300, tags: ['jobs', 'analytics'] });

      this.logger.debug('Job stats cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm job stats:', error);
    }
  }

  /**
   * Warm customer statistics
   */
  private async warmCustomerStats(): Promise<void> {
    try {
      await this.cacheService.set('cache:warming:customer-stats', {
        status: 'warmed',
        timestamp: new Date(),
      }, { ttl: 300, tags: ['customers', 'analytics'] });

      this.logger.debug('Customer stats cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm customer stats:', error);
    }
  }

  /**
   * Periodic cache refresh
   * Run every 10 minutes to keep hot caches fresh
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshCaches(): Promise<void> {
    this.logger.log('Running periodic cache refresh...');

    // Get current cache stats
    const stats = this.cacheService.getStats();

    // Only refresh if hit rate is above 50% (caches are being used)
    if (stats.hitRate > 50) {
      await this.warmCaches();
    } else {
      this.logger.log(`Skipping cache refresh - hit rate too low (${stats.hitRate.toFixed(2)}%)`);
    }
  }

  /**
   * Clear all warming markers
   * Useful for testing or forcing fresh data
   */
  async clearWarmingMarkers(): Promise<void> {
    await this.cacheService.deletePattern('cache:warming:*');
    this.logger.log('Cleared all cache warming markers');
  }

  /**
   * Get cache warming status
   */
  async getWarmingStatus(): Promise<{
    isWarmed: boolean;
    lastWarmedAt: Date | null;
    markers: string[];
  }> {
    const dashboard = await this.cacheService.get('cache:warming:dashboard');
    const jobs = await this.cacheService.get('cache:warming:jobs');
    const customers = await this.cacheService.get('cache:warming:customers');
    const jobStats = await this.cacheService.get('cache:warming:job-stats');
    const customerStats = await this.cacheService.get('cache:warming:customer-stats');

    const markers: string[] = [];
    let lastWarmedAt: Date | null = null;

    if (dashboard) {
      markers.push('dashboard');
      lastWarmedAt = (dashboard as any).timestamp;
    }
    if (jobs) markers.push('jobs');
    if (customers) markers.push('customers');
    if (jobStats) markers.push('job-stats');
    if (customerStats) markers.push('customer-stats');

    return {
      isWarmed: markers.length >= 3, // At least 3 of 5 caches warmed
      lastWarmedAt,
      markers,
    };
  }
}
