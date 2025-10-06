import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogsService } from '../audit-logs.service';
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
} from '../decorators/audit-log.decorator';

/**
 * Interceptor for automatic audit logging
 *
 * Automatically logs actions when endpoints are decorated with @AuditLog()
 * Captures request details, response, and any errors that occur.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get audit log metadata from decorator
    const auditMetadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // If no audit log metadata, skip logging
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip if no user (shouldn't happen for protected routes)
    if (!user) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        // Log successful action
        const duration = Date.now() - startTime;

        await this.auditLogsService.createLog({
          timestamp: new Date(),
          userId: user.id || user._id?.toString(),
          userName: user.fullName || user.username,
          action: auditMetadata.action,
          resource: auditMetadata.resource,
          resourceId: this.extractResourceId(request, response),
          severity: auditMetadata.severity || 'info',
          ipAddress:
            request.ip || request.connection?.remoteAddress || 'unknown',
          userAgent: request.headers['user-agent'],
          sessionId: request.sessionId,
          outcome: 'success',
          changes: this.extractChanges(request, response, auditMetadata),
          metadata: {
            method: request.method,
            path: request.path,
            duration: `${duration}ms`,
            statusCode: response?.statusCode || 200,
          },
        });
      }),
      catchError((error) => {
        // Log failed action
        const duration = Date.now() - startTime;

        this.auditLogsService
          .createLog({
            timestamp: new Date(),
            userId: user.id || user._id?.toString(),
            userName: user.fullName || user.username,
            action: auditMetadata.action,
            resource: auditMetadata.resource,
            resourceId: this.extractResourceId(request, null),
            severity: 'error',
            ipAddress:
              request.ip || request.connection?.remoteAddress || 'unknown',
            userAgent: request.headers['user-agent'],
            sessionId: request.sessionId,
            outcome: 'failure',
            errorMessage: error.message,
            errorStack: error.stack,
            metadata: {
              method: request.method,
              path: request.path,
              duration: `${duration}ms`,
              statusCode: error.status || 500,
            },
          })
          .catch((logError) => {
            this.logger.error('Failed to create audit log for error', logError);
          });

        return throwError(() => error);
      }),
    );
  }

  /**
   * Extract resource ID from request or response
   */
  private extractResourceId(request: any, response: any): string | undefined {
    // Try to get from URL params
    if (request.params?.id) {
      return request.params.id;
    }

    // Try to get from response body
    if (response?.data?.id) {
      return response.data.id;
    }

    if (response?.data?._id) {
      return response.data._id.toString();
    }

    if (response?.customer?.id) {
      return response.customer.id;
    }

    if (response?.job?.id) {
      return response.job.id;
    }

    return undefined;
  }

  /**
   * Extract changes from request and response for audit trail
   */
  private extractChanges(
    request: any,
    response: any,
    metadata: AuditLogMetadata,
  ): { before?: any; after?: any } | undefined {
    if (!metadata.includeBody && !metadata.includeResponse) {
      return undefined;
    }

    const changes: { before?: any; after?: any } = {};

    if (metadata.includeBody && request.body) {
      // For updates, body might contain "before" state
      changes.before = this.sanitizeData(request.body);
    }

    if (metadata.includeResponse && response) {
      // Response contains "after" state
      changes.after = this.sanitizeData(response.data || response);
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
