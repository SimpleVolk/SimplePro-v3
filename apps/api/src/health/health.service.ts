import { Injectable, Logger } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { DiskHealthIndicator } from './indicators/disk-health.indicator';
import { ExternalServiceHealthIndicator } from './indicators/external-service-health.indicator';
import { HealthCheckLevel } from './interfaces/health-check.interface';
import { HealthCheckResponseDto } from './dto/health-check.dto';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly serviceName = 'simplepro-api';
  private readonly version = process.env.npm_package_version || '1.0.0';
  private readonly environment = process.env.NODE_ENV || 'development';

  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
    private readonly externalServiceHealthIndicator: ExternalServiceHealthIndicator,
  ) {}

  /**
   * Basic health check - fast, minimal dependencies
   */
  @HealthCheck()
  async basicHealthCheck(): Promise<HealthCheckResponseDto> {
    const startTime = Date.now();
    
    try {
      const result = await this.health.check([
        // Only check critical dependencies for basic check
        () => this.databaseHealthIndicator.isHealthy('database', 2000),
      ]);

      return this.formatHealthCheckResponse(result, startTime, HealthCheckLevel.BASIC);
    } catch (error) {
      this.logger.error('Basic health check failed:', error);
      return this.formatErrorResponse(error, startTime, HealthCheckLevel.BASIC);
    }
  }

  /**
   * Detailed health check - comprehensive dependency validation
   */
  @HealthCheck()
  async detailedHealthCheck(): Promise<HealthCheckResponseDto> {
    const startTime = Date.now();
    
    try {
      const result = await this.health.check([
        // Core infrastructure
        () => this.databaseHealthIndicator.isHealthy('database', 5000),
        () => this.redisHealthIndicator.isHealthy('redis', 3000),
        
        // System resources
        () => this.memoryHealthIndicator.isHealthy('memory'),
        () => this.diskHealthIndicator.isHealthy('disk'),
      ]);

      return this.formatHealthCheckResponse(result, startTime, HealthCheckLevel.DETAILED);
    } catch (error) {
      this.logger.error('Detailed health check failed:', error);
      return this.formatErrorResponse(error, startTime, HealthCheckLevel.DETAILED);
    }
  }

  /**
   * Full health check - includes external services
   */
  @HealthCheck()
  async fullHealthCheck(): Promise<HealthCheckResponseDto> {
    const startTime = Date.now();
    
    try {
      const checks = [
        // Core infrastructure
        () => this.databaseHealthIndicator.isHealthy('database', 5000),
        () => this.redisHealthIndicator.isHealthy('redis', 3000),
        
        // System resources
        () => this.memoryHealthIndicator.isHealthy('memory'),
        () => this.diskHealthIndicator.isHealthy('disk'),
      ];

      // Add external service checks if configured
      const externalServices = this.externalServiceHealthIndicator.getConfiguredServices();
      if (externalServices.length > 0) {
        checks.push(
          ...externalServices.map(service => 
            () => this.externalServiceHealthIndicator.isHealthy(
              service.key, 
              service.url, 
              service.timeout
            )
          )
        );
      }

      const result = await this.health.check(checks);

      return this.formatHealthCheckResponse(result, startTime, HealthCheckLevel.FULL);
    } catch (error) {
      this.logger.error('Full health check failed:', error);
      return this.formatErrorResponse(error, startTime, HealthCheckLevel.FULL);
    }
  }

  /**
   * Liveness probe - minimal check to verify service is running
   */
  async livenessCheck(): Promise<HealthCheckResponseDto> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      version: this.version,
      info: {
        liveness: {
          status: 'up',
          uptime: process.uptime(),
          pid: process.pid
        }
      }
    };
  }

  /**
   * Readiness probe - check if service is ready to receive traffic
   */
  async readinessCheck(): Promise<HealthCheckResponseDto> {
    const startTime = Date.now();
    
    try {
      // For readiness, we need at least database connectivity
      const result = await this.health.check([
        () => this.databaseHealthIndicator.isHealthy('database', 3000),
      ]);

      const response = this.formatHealthCheckResponse(result, startTime, HealthCheckLevel.BASIC);
      
      // Add readiness-specific information
      response.details = {
        ...response.details,
        readiness: {
          ready: true,
          checkedAt: new Date().toISOString(),
          responseTime: Date.now() - startTime
        }
      };

      return response;
    } catch (error) {
      this.logger.error('Readiness check failed:', error);
      const errorResponse = this.formatErrorResponse(error, startTime, HealthCheckLevel.BASIC);
      
      errorResponse.details = {
        ...errorResponse.details,
        readiness: {
          ready: false,
          checkedAt: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      return errorResponse;
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    const memUsage = process.memoryUsage();
    
    return {
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
      node: {
        version: process.version,
        uptime: process.uptime(),
        pid: process.pid,
        platform: process.platform,
        arch: process.arch
      },
      memory: {
        rss: this.formatBytes(memUsage.rss),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        external: this.formatBytes(memUsage.external),
        arrayBuffers: this.formatBytes(memUsage.arrayBuffers || 0)
      },
      timestamp: new Date().toISOString()
    };
  }

  private formatHealthCheckResponse(
    result: HealthCheckResult, 
    startTime: number, 
    level: HealthCheckLevel
  ): HealthCheckResponseDto {
    const responseTime = Date.now() - startTime;
    
    return {
      status: result.status,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      version: this.version,
      info: result.info,
      details: {
        level,
        responseTime,
        checks: Object.keys(result.info || {}).length,
        timestamp: new Date().toISOString()
      }
    };
  }

  private formatErrorResponse(
    error: any, 
    startTime: number, 
    level: HealthCheckLevel
  ): HealthCheckResponseDto {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      version: this.version,
      error: error?.causes || { message: error?.message || 'Unknown error' },
      details: {
        level,
        responseTime,
        timestamp: new Date().toISOString(),
        errorType: error?.constructor?.name || 'Error'
      }
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
