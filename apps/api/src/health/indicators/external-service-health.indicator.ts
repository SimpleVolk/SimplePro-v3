import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ExternalServiceHealthInfo } from '../interfaces/health-check.interface';
import { firstValueFrom, timeout, catchError } from 'rxjs';

@Injectable()
export class ExternalServiceHealthIndicator extends HealthIndicator {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async isHealthy(
    key: string,
    url: string,
    timeoutMs = 5000,
  ): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService
          .get(url, {
            timeout: timeoutMs,
            headers: {
              'User-Agent': 'SimplePro-HealthCheck/1.0',
              Accept: 'application/json, text/plain, */*',
            },
            // Don't follow redirects for health checks
            maxRedirects: 0,
            // Don't throw on HTTP error status codes
            validateStatus: () => true,
          })
          .pipe(
            timeout(timeoutMs),
            catchError((error) => {
              // Transform axios errors into our standard format
              const errorInfo = {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
              };
              throw new Error(
                `HTTP request failed: ${JSON.stringify(errorInfo)}`,
              );
            }),
          ),
      );

      const responseTime = Date.now() - startTime;
      const healthInfo: ExternalServiceHealthInfo = {
        status: this.isSuccessStatus(response.status) ? 'up' : 'down',
        responseTime,
        endpoint: url,
        httpStatus: response.status,
      };

      if (!this.isSuccessStatus(response.status)) {
        throw new Error(
          `Service returned non-success status: ${response.status} ${response.statusText}`,
        );
      }

      return this.getStatus(key, true, healthInfo);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown external service error';

      throw new HealthCheckError(
        `External service health check failed: ${errorMessage}`,
        this.getStatus(key, false, {
          status: 'down' as const,
          responseTime,
          endpoint: url,
          error: errorMessage,
        }),
      );
    }
  }

  /**
   * Check multiple external services concurrently
   */
  async checkMultipleServices(
    services: Array<{ key: string; url: string; timeout?: number }>,
  ): Promise<HealthIndicatorResult[]> {
    const checkPromises = services.map(async (service) => {
      try {
        return await this.isHealthy(service.key, service.url, service.timeout);
      } catch (error) {
        // Return the error as a result rather than throwing
        if (error instanceof HealthCheckError) {
          return error.causes;
        }
        return this.getStatus(service.key, false, {
          status: 'down' as const,
          endpoint: service.url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    return Promise.all(checkPromises);
  }

  /**
   * Check if HTTP status code indicates success
   */
  private isSuccessStatus(status: number): boolean {
    return status >= 200 && status < 400;
  }

  /**
   * Get configured external services for health checks
   */
  getConfiguredServices(): Array<{
    key: string;
    url: string;
    timeout?: number;
  }> {
    const services: Array<{ key: string; url: string; timeout?: number }> = [];

    // Add external services based on environment configuration
    if (process.env.EXTERNAL_API_URL) {
      services.push({
        key: 'external-api',
        url: `${process.env.EXTERNAL_API_URL}/health`,
        timeout: 5000,
      });
    }

    if (process.env.WEBHOOK_SERVICE_URL) {
      services.push({
        key: 'webhook-service',
        url: `${process.env.WEBHOOK_SERVICE_URL}/ping`,
        timeout: 3000,
      });
    }

    if (process.env.NOTIFICATION_SERVICE_URL) {
      services.push({
        key: 'notification-service',
        url: `${process.env.NOTIFICATION_SERVICE_URL}/health`,
        timeout: 3000,
      });
    }

    // Add third-party service health checks
    if (process.env.STRIPE_ENABLED === 'true') {
      services.push({
        key: 'stripe-api',
        url: 'https://status.stripe.com/api/v2/status.json',
        timeout: 5000,
      });
    }

    return services;
  }
}
