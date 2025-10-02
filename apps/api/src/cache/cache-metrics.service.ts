import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * CacheMetricsService - Monitor and track cache performance
 *
 * Metrics tracked:
 * - Cache hit rate (target: >70%)
 * - Cache size and memory usage
 * - Operation counts (get, set, delete)
 * - Error rates
 * - Response times
 *
 * These metrics can be exposed via /metrics endpoint for Prometheus
 */
@Injectable()
export class CacheMetricsService {
  private readonly logger = new Logger(CacheMetricsService.name);

  private metrics = {
    // Counters
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,

    // Gauges
    hitRate: 0,
    cacheSize: 0,
    isConnected: false,

    // Histograms (simplified - store last 100 measurements)
    getLatencies: [] as number[],
    setLatencies: [] as number[],

    // Timestamps
    lastReset: new Date(),
    lastUpdate: new Date(),
  };

  constructor(private cacheService: CacheService) {}

  /**
   * Update metrics from cache service
   * Run every minute to collect current stats
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateMetrics(): Promise<void> {
    try {
      const stats = this.cacheService.getStats();
      const isConnected = this.cacheService.isConnected();

      this.metrics.hits = stats.hits;
      this.metrics.misses = stats.misses;
      this.metrics.sets = stats.sets;
      this.metrics.deletes = stats.deletes;
      this.metrics.errors = stats.errors;
      this.metrics.hitRate = stats.hitRate;
      this.metrics.isConnected = isConnected;
      this.metrics.lastUpdate = new Date();

      // Log if hit rate is below threshold
      if (stats.hitRate < 70 && stats.hits + stats.misses > 100) {
        this.logger.warn(`Cache hit rate below target: ${stats.hitRate.toFixed(2)}% (target: 70%)`);
      }

      // Log if errors are increasing
      if (stats.errors > 10) {
        this.logger.warn(`Cache errors detected: ${stats.errors}`);
      }

      this.logger.debug(`Cache metrics updated: Hit rate ${stats.hitRate.toFixed(2)}%, Hits ${stats.hits}, Misses ${stats.misses}`);
    } catch (error) {
      this.logger.error('Failed to update cache metrics:', error);
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalRequests: this.metrics.hits + this.metrics.misses,
      avgGetLatency: this.calculateAverage(this.metrics.getLatencies),
      avgSetLatency: this.calculateAverage(this.metrics.setLatencies),
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();

    return `
# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total ${metrics.hits}

# HELP cache_misses_total Total number of cache misses
# TYPE cache_misses_total counter
cache_misses_total ${metrics.misses}

# HELP cache_sets_total Total number of cache sets
# TYPE cache_sets_total counter
cache_sets_total ${metrics.sets}

# HELP cache_deletes_total Total number of cache deletes
# TYPE cache_deletes_total counter
cache_deletes_total ${metrics.deletes}

# HELP cache_errors_total Total number of cache errors
# TYPE cache_errors_total counter
cache_errors_total ${metrics.errors}

# HELP cache_hit_rate Current cache hit rate percentage
# TYPE cache_hit_rate gauge
cache_hit_rate ${metrics.hitRate}

# HELP cache_connected Redis connection status (1=connected, 0=disconnected)
# TYPE cache_connected gauge
cache_connected ${metrics.isConnected ? 1 : 0}

# HELP cache_requests_total Total number of cache requests
# TYPE cache_requests_total counter
cache_requests_total ${metrics.totalRequests}

# HELP cache_get_latency_seconds Average GET operation latency
# TYPE cache_get_latency_seconds gauge
cache_get_latency_seconds ${(metrics.avgGetLatency / 1000).toFixed(6)}

# HELP cache_set_latency_seconds Average SET operation latency
# TYPE cache_set_latency_seconds gauge
cache_set_latency_seconds ${(metrics.avgSetLatency / 1000).toFixed(6)}
`.trim();
  }

  /**
   * Record GET operation latency
   */
  recordGetLatency(latencyMs: number): void {
    this.metrics.getLatencies.push(latencyMs);
    if (this.metrics.getLatencies.length > 100) {
      this.metrics.getLatencies.shift();
    }
  }

  /**
   * Record SET operation latency
   */
  recordSetLatency(latencyMs: number): void {
    this.metrics.setLatencies.push(latencyMs);
    if (this.metrics.setLatencies.length > 100) {
      this.metrics.setLatencies.shift();
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      cacheSize: 0,
      isConnected: this.metrics.isConnected,
      getLatencies: [],
      setLatencies: [],
      lastReset: new Date(),
      lastUpdate: new Date(),
    };

    this.cacheService.resetStats();
    this.logger.log('Cache metrics reset');
  }

  /**
   * Get cache health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  } {
    const metrics = this.getMetrics();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const details: Record<string, any> = {};

    // Check connection
    if (!metrics.isConnected) {
      status = 'unhealthy';
      details.connection = 'Redis disconnected - using memory fallback';
    }

    // Check hit rate (only if we have enough requests)
    if (metrics.totalRequests > 100) {
      if (metrics.hitRate < 50) {
        status = 'unhealthy';
        details.hitRate = `Very low hit rate: ${metrics.hitRate.toFixed(2)}%`;
      } else if (metrics.hitRate < 70) {
        status = status === 'healthy' ? 'degraded' : status;
        details.hitRate = `Below target hit rate: ${metrics.hitRate.toFixed(2)}%`;
      } else {
        details.hitRate = `Good hit rate: ${metrics.hitRate.toFixed(2)}%`;
      }
    }

    // Check error rate
    const errorRate = metrics.totalRequests > 0
      ? (metrics.errors / metrics.totalRequests) * 100
      : 0;

    if (errorRate > 10) {
      status = 'unhealthy';
      details.errors = `High error rate: ${errorRate.toFixed(2)}%`;
    } else if (errorRate > 5) {
      status = status === 'healthy' ? 'degraded' : status;
      details.errors = `Elevated error rate: ${errorRate.toFixed(2)}%`;
    }

    // Check latency
    if (metrics.avgGetLatency > 100) {
      status = status === 'healthy' ? 'degraded' : status;
      details.latency = `High GET latency: ${metrics.avgGetLatency.toFixed(2)}ms`;
    }

    return { status, details };
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
}
