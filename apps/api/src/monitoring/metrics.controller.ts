import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   * Format: https://prometheus.io/docs/instrumenting/exposition_formats/
   */
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    return this.metricsService.getPrometheusMetrics();
  }

  /**
   * Health metrics in JSON format
   */
  @Get('health')
  async getHealthMetrics() {
    return this.metricsService.getHealthMetrics();
  }

  /**
   * System information
   */
  @Get('system')
  getSystemInfo() {
    return this.metricsService.getSystemInfo();
  }
}
