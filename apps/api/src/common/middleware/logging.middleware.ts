import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface LogContext {
  requestId: string;
  correlationId: string;
  method: string;
  url: string;
  userAgent: string;
  clientIp: string;
  userId?: string;
  username?: string;
  sessionId?: string;
  timestamp: string;
}

interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

interface SecurityContext {
  sensitiveDataMasked: boolean;
  authAttempt?: boolean;
  adminOperation?: boolean;
  dataAccess?: string[];
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);
  private readonly performanceLogger = new Logger('Performance');
  private readonly securityLogger = new Logger('Security');
  private readonly auditLogger = new Logger('Audit');

  // Sensitive fields that should be masked in logs
  private readonly sensitiveFields = [
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'refreshToken',
    'accessToken',
    'authorization',
    'cookie',
    'ssn',
    'creditCard',
    'bankAccount',
    'apiKey',
    'secret',
  ];

  // Endpoints that require audit logging
  private readonly auditEndpoints = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/auth/change-password',
    '/api/auth/users',
    '/api/customers',
    '/api/jobs',
    '/api/pricing-rules',
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Generate correlation ID if not present
    const correlationId = req.get('X-Correlation-ID') || this.generateCorrelationId();
    const requestId = (req as any).securityContext?.requestId || this.generateRequestId();

    // Set correlation ID in response headers
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', requestId);

    // Extract user context from JWT if available
    const userContext = this.extractUserContext(req);

    // Create log context
    const logContext: LogContext = {
      requestId,
      correlationId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent') || 'Unknown',
      clientIp: this.getClientIp(req),
      timestamp,
      ...userContext,
    };

    // Performance metrics
    const perfMetrics: PerformanceMetrics = {
      startTime,
      memoryUsage: process.memoryUsage(),
    };

    // Security context
    const securityContext: SecurityContext = {
      sensitiveDataMasked: true,
      authAttempt: req.path.includes('/auth/'),
      adminOperation: this.isAdminOperation(req),
      dataAccess: this.getDataAccessTypes(req),
    };

    // Attach context to request for use by other middleware/controllers
    (req as any).logContext = logContext;
    (req as any).perfMetrics = perfMetrics;
    (req as any).securityContext = securityContext;

    // Log incoming request
    this.logIncomingRequest(req, logContext, securityContext);

    // Capture original end method
    const originalEnd = res.end;
    const originalWrite = res.write;
    const chunks: Buffer[] = [];

    // Override response methods to capture response data
    res.write = function(chunk: any, ...args: any[]) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return originalWrite.apply(res, [chunk, ...args] as any);
    };

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    res.end = function(chunk?: any): Response {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      // Calculate performance metrics
      perfMetrics.endTime = Date.now();
      perfMetrics.duration = perfMetrics.endTime - perfMetrics.startTime;

      // Get response body for audit logging (with masking)
      const responseBody = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : '';

      // Log outgoing response
      self.logOutgoingResponse(req, res, logContext, perfMetrics, responseBody);

      // Audit logging for sensitive operations
      if (self.requiresAuditLog(req)) {
        self.logAuditEvent(req, res, logContext, responseBody);
      }

      // Performance monitoring
      self.logPerformanceMetrics(req, res, logContext, perfMetrics);

      // Security event logging
      self.logSecurityEvents(req, res, logContext, securityContext);

      // Call original end
      if (chunk) {
        (originalEnd as any).call(res, chunk, 'utf8');
      } else {
        (originalEnd as any).call(res);
      }
      return res;
    };

    next();
  }

  private logIncomingRequest(req: Request, logContext: LogContext, securityContext: SecurityContext): void {
    const sanitizedBody = this.sanitizeData(req.body);
    const sanitizedQuery = this.sanitizeData(req.query);
    const sanitizedHeaders = this.sanitizeHeaders(req.headers);

    const logData = {
      type: 'incoming_request',
      ...logContext,
      headers: sanitizedHeaders,
      query: sanitizedQuery,
      body: sanitizedBody,
      contentLength: req.get('Content-Length') || 0,
      securityContext,
    };

    this.logger.log(`→ ${req.method} ${req.url}`, logData);

    // Log authentication attempts separately
    if (securityContext.authAttempt) {
      this.securityLogger.log(`Auth attempt: ${req.method} ${req.path}`, {
        ...logContext,
        authPath: req.path,
        hasCredentials: !!(req.body?.username || req.body?.email),
      });
    }
  }

  logOutgoingResponse(
    req: Request,
    res: Response,
    logContext: LogContext,
    perfMetrics: PerformanceMetrics,
    responseBody: string
  ): void {
    const sanitizedResponse = this.sanitizeData(this.parseResponseBody(responseBody));

    const logData = {
      type: 'outgoing_response',
      ...logContext,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration: perfMetrics.duration,
      responseSize: responseBody.length,
      response: this.shouldLogResponseBody(req, res) ? sanitizedResponse : '[BODY_NOT_LOGGED]',
      headers: this.sanitizeHeaders(res.getHeaders()),
    };

    const logLevel = this.getLogLevel(res.statusCode);
    this.logger[logLevel](`← ${res.statusCode} ${req.method} ${req.url} [${perfMetrics.duration}ms]`, logData);
  }

  logAuditEvent(req: Request, res: Response, logContext: LogContext, responseBody: string): void {
    const auditData = {
      type: 'audit_event',
      ...logContext,
      operation: `${req.method} ${req.path}`,
      statusCode: res.statusCode,
      success: res.statusCode < 400,
      resourceType: this.getResourceType(req.path),
      action: this.getAction(req.method, req.path),
      requestData: this.sanitizeData(req.body),
      responseData: this.sanitizeData(this.parseResponseBody(responseBody)),
      compliance: {
        dataAccess: (req as any).securityContext?.dataAccess || [],
        sensitiveDataAccessed: this.containsSensitiveData(req.body) || this.containsSensitiveData(responseBody),
        auditRequired: true,
      },
    };

    this.auditLogger.log(`Audit: ${auditData.operation}`, auditData);
  }

  logPerformanceMetrics(
    req: Request,
    res: Response,
    logContext: LogContext,
    perfMetrics: PerformanceMetrics
  ): void {
    const currentMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: currentMemory.heapUsed - (perfMetrics.memoryUsage?.heapUsed || 0),
      heapTotal: currentMemory.heapTotal - (perfMetrics.memoryUsage?.heapTotal || 0),
      external: currentMemory.external - (perfMetrics.memoryUsage?.external || 0),
      rss: currentMemory.rss - (perfMetrics.memoryUsage?.rss || 0),
    };

    const performanceData = {
      type: 'performance_metrics',
      requestId: logContext.requestId,
      correlationId: logContext.correlationId,
      endpoint: `${req.method} ${req.path}`,
      duration: perfMetrics.duration,
      statusCode: res.statusCode,
      memoryUsage: currentMemory,
      memoryDelta,
      requestSize: parseInt(req.get('Content-Length') || '0'),
      responseSize: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString(),
    };

    // Log performance warnings for slow requests
    if (perfMetrics.duration! > 5000) {
      this.performanceLogger.warn(`Slow request detected: ${perfMetrics.duration}ms`, performanceData);
    } else if (perfMetrics.duration! > 1000) {
      this.performanceLogger.log(`Performance: ${perfMetrics.duration}ms`, performanceData);
    }

    // Log memory warnings
    const memoryThreshold = 100 * 1024 * 1024; // 100MB
    if (Math.abs(memoryDelta.heapUsed) > memoryThreshold) {
      this.performanceLogger.warn(`Memory usage spike detected`, {
        ...performanceData,
        memorySpike: memoryDelta.heapUsed,
      });
    }
  }

  logSecurityEvents(
    req: Request,
    res: Response,
    logContext: LogContext,
    securityContext: SecurityContext
  ): void {
    // Log failed authentication attempts
    if (securityContext.authAttempt && res.statusCode === 401) {
      this.securityLogger.warn(`Failed authentication attempt`, {
        ...logContext,
        attemptedUsername: req.body?.username || req.body?.email,
        reason: 'Invalid credentials',
        consecutiveFailures: this.getConsecutiveFailures(logContext.clientIp),
      });
    }

    // Log successful authentication
    if (securityContext.authAttempt && res.statusCode === 200) {
      this.securityLogger.log(`Successful authentication`, {
        ...logContext,
        username: req.body?.username || req.body?.email,
      });
    }

    // Log admin operations
    if (securityContext.adminOperation) {
      this.securityLogger.log(`Admin operation performed`, {
        ...logContext,
        operation: `${req.method} ${req.path}`,
        statusCode: res.statusCode,
        dataAccess: securityContext.dataAccess,
      });
    }

    // Log error responses that might indicate attacks
    if (res.statusCode >= 400) {
      const securityEventData = {
        ...logContext,
        statusCode: res.statusCode,
        errorType: this.getErrorType(res.statusCode),
        potentialThreat: this.assessThreatLevel(req, res),
      };

      if (res.statusCode >= 500) {
        this.securityLogger.error(`Server error occurred`, securityEventData);
      } else if (res.statusCode === 429) {
        this.securityLogger.warn(`Rate limit triggered`, securityEventData);
      } else if (res.statusCode === 403) {
        this.securityLogger.warn(`Access denied`, securityEventData);
      }
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitized = JSON.parse(JSON.stringify(data));
    return this.maskSensitiveFields(sensitized);
  }

  private maskSensitiveFields(obj: any, prefix = ''): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.maskSensitiveFields(item, `${prefix}[${index}]`));
    }

    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const lowerKey = key.toLowerCase();

      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        (masked as any)[key] = '[MASKED]';
      } else if (typeof value === 'object') {
        (masked as any)[key] = this.maskSensitiveFields(value, fullKey);
      } else {
        (masked as any)[key] = value;
      }
    }

    return masked;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[MASKED]';
      }
    }

    return sanitized;
  }

  private parseResponseBody(body: string): any {
    try {
      return JSON.parse(body);
    } catch {
      return body.length > 200 ? `${body.substring(0, 200)}...` : body;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private shouldLogResponseBody(_req: Request, res: Response): boolean {
    // Don't log response body for certain content types or large responses
    const contentType = res.get('Content-Type') || '';
    const contentLength = parseInt(res.get('Content-Length') || '0');

    if (contentLength > 10000) return false; // Skip large responses
    if (contentType.includes('image/')) return false;
    if (contentType.includes('video/')) return false;
    if (contentType.includes('audio/')) return false;
    if (contentType.includes('application/octet-stream')) return false;

    return true;
  }

  requiresAuditLog(req: Request): boolean {
    return this.auditEndpoints.some(endpoint => req.path.startsWith(endpoint));
  }

  private isAdminOperation(req: Request): boolean {
    const adminPaths = ['/api/auth/users', '/api/auth/roles', '/api/pricing-rules', '/api/system'];
    return adminPaths.some(path => req.path.startsWith(path));
  }

  private getDataAccessTypes(req: Request): string[] {
    const dataTypes: string[] = [];

    if (req.path.includes('/customers')) dataTypes.push('customer_data');
    if (req.path.includes('/jobs')) dataTypes.push('job_data');
    if (req.path.includes('/estimates')) dataTypes.push('estimate_data');
    if (req.path.includes('/auth')) dataTypes.push('auth_data');
    if (req.path.includes('/users')) dataTypes.push('user_data');

    return dataTypes;
  }

  private extractUserContext(req: Request): Partial<LogContext> {
    const user = (req as any).user;
    if (!user) return {};

    return {
      userId: user.id || user.sub,
      username: user.username,
      sessionId: user.sessionId,
    };
  }

  private getClientIp(req: Request): string {
    return (req as any).securityContext?.clientIp ||
           req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
           req.get('X-Real-IP') ||
           req.ip ||
           'unknown';
  }

  private getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'log';
  }

  private getResourceType(path: string): string {
    if (path.includes('/customers')) return 'customer';
    if (path.includes('/jobs')) return 'job';
    if (path.includes('/estimates')) return 'estimate';
    if (path.includes('/auth')) return 'authentication';
    if (path.includes('/users')) return 'user';
    return 'unknown';
  }

  private getAction(method: string, path: string): string {
    switch (method) {
      case 'GET': return path.includes('/:') ? 'read' : 'list';
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'unknown';
    }
  }

  private containsSensitiveData(data: any): boolean {
    if (!data) return false;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return this.sensitiveFields.some(field => str.toLowerCase().includes(field));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getConsecutiveFailures(_clientIp: string): number {
    // This would typically be stored in Redis or database
    // For now, return a placeholder
    return 0;
  }

  private getErrorType(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 429: return 'Rate Limited';
      case 500: return 'Internal Server Error';
      default: return 'Unknown Error';
    }
  }

  private assessThreatLevel(req: Request, res: Response): 'low' | 'medium' | 'high' {
    if (res.statusCode === 401 && req.path.includes('/auth/')) return 'medium';
    if (res.statusCode === 403) return 'medium';
    if (res.statusCode === 429) return 'high';
    if (res.statusCode >= 500) return 'high';
    return 'low';
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check method for monitoring
  getLoggingStatus(): {
    requestsLogged: number;
    securityEventsLogged: number;
    performanceIssues: number;
    auditEventsLogged: number;
  } {
    // This would typically come from metrics storage
    return {
      requestsLogged: 0,
      securityEventsLogged: 0,
      performanceIssues: 0,
      auditEventsLogged: 0,
    };
  }
}