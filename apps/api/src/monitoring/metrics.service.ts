import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

interface HealthMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    connected: boolean;
    responseTime: number;
  };
  redis: {
    connected: boolean;
    responseTime: number;
  };
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, Metric> = new Map();
  private startTime: number = Date.now();

  // Request metrics
  private httpRequestsTotal = 0;
  private httpRequestDurations: number[] = [];
  private httpErrorsTotal = 0;

  // Business metrics
  private estimatesCreated = 0;
  private jobsCreated = 0;
  private customersCreated = 0;

  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      existing.value += 1;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        name,
        type: 'counter',
        value: 1,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.metrics.set(key, {
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a histogram value (for durations, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.type === 'histogram') {
      // Simple average calculation
      existing.value = (existing.value + value) / 2;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        name,
        type: 'histogram',
        value,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal++;
    this.httpRequestDurations.push(duration);

    // Keep only last 1000 durations
    if (this.httpRequestDurations.length > 1000) {
      this.httpRequestDurations.shift();
    }

    this.incrementCounter('http_requests_total', {
      method,
      path,
      status: statusCode.toString(),
    });

    this.recordHistogram('http_request_duration_seconds', duration / 1000, {
      method,
      path,
    });

    if (statusCode >= 400) {
      this.httpErrorsTotal++;
      this.incrementCounter('http_errors_total', {
        method,
        path,
        status: statusCode.toString(),
      });
    }
  }

  /**
   * Record business event
   */
  recordBusinessEvent(event: 'estimate_created' | 'job_created' | 'customer_created'): void {
    switch (event) {
      case 'estimate_created':
        this.estimatesCreated++;
        break;
      case 'job_created':
        this.jobsCreated++;
        break;
      case 'customer_created':
        this.customersCreated++;
        break;
    }

    this.incrementCounter('business_events_total', { type: event });
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    const lines: string[] = [];

    // System metrics
    const memUsage = process.memoryUsage();
    lines.push('# HELP process_memory_bytes Memory usage in bytes');
    lines.push('# TYPE process_memory_bytes gauge');
    lines.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);
    lines.push(`process_memory_bytes{type="heap_used"} ${memUsage.heapUsed}`);
    lines.push(`process_memory_bytes{type="heap_total"} ${memUsage.heapTotal}`);

    // Uptime
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${(Date.now() - this.startTime) / 1000}`);

    // HTTP metrics
    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${this.httpRequestsTotal}`);

    lines.push('# HELP http_errors_total Total HTTP errors');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${this.httpErrorsTotal}`);

    if (this.httpRequestDurations.length > 0) {
      const avgDuration =
        this.httpRequestDurations.reduce((a, b) => a + b, 0) / this.httpRequestDurations.length;
      lines.push('# HELP http_request_duration_seconds HTTP request duration');
      lines.push('# TYPE http_request_duration_seconds histogram');
      lines.push(`http_request_duration_seconds ${avgDuration / 1000}`);
    }

    // Database metrics
    const dbConnected = this.connection.readyState === 1;
    lines.push('# HELP database_connected Database connection status');
    lines.push('# TYPE database_connected gauge');
    lines.push(`database_connected ${dbConnected ? 1 : 0}`);

    // Business metrics
    lines.push('# HELP business_estimates_created_total Total estimates created');
    lines.push('# TYPE business_estimates_created_total counter');
    lines.push(`business_estimates_created_total ${this.estimatesCreated}`);

    lines.push('# HELP business_jobs_created_total Total jobs created');
    lines.push('# TYPE business_jobs_created_total counter');
    lines.push(`business_jobs_created_total ${this.jobsCreated}`);

    lines.push('# HELP business_customers_created_total Total customers created');
    lines.push('# TYPE business_customers_created_total counter');
    lines.push(`business_customers_created_total ${this.customersCreated}`);

    // Custom metrics from map
    for (const [, metric] of this.metrics) {
      const labelsStr = metric.labels
        ? Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        : '';

      lines.push(`${metric.name}${labelsStr ? `{${labelsStr}}` : ''} ${metric.value}`);
    }

    return lines.join('\n');
  }

  /**
   * Get health metrics
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    const memUsage = process.memoryUsage();
    const uptime = (Date.now() - this.startTime) / 1000;

    // Check database connectivity
    let dbResponseTime = 0;
    const dbStart = Date.now();
    const dbConnected = this.connection.readyState === 1;
    if (dbConnected) {
      try {
        await this.connection.db.admin().ping();
        dbResponseTime = Date.now() - dbStart;
      } catch (error) {
        // Database not responding
      }
    }

    return {
      uptime,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
      database: {
        connected: dbConnected,
        responseTime: dbResponseTime,
      },
      redis: {
        connected: false, // TODO: Implement Redis health check
        responseTime: 0,
      },
    };
  }

  /**
   * Get system info
   */
  getSystemInfo(): Record<string, any> {
    return {
      version: process.env.VERSION || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.httpRequestsTotal = 0;
    this.httpRequestDurations = [];
    this.httpErrorsTotal = 0;
    this.estimatesCreated = 0;
    this.jobsCreated = 0;
    this.customersCreated = 0;
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}
