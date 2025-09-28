import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  correlationId?: string;
  details?: any;
  stack?: string;
  validation?: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

interface SecurityContext {
  requestId: string;
  correlationId: string;
  clientIp: string;
  userAgent: string;
  userId?: string;
  username?: string;
  path: string;
  method: string;
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly securityLogger = new Logger('SecurityError');
  private readonly auditLogger = new Logger('ErrorAudit');

  // Sensitive error messages that should be hidden in production
  private readonly sensitiveErrorPatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /credential/i,
    /authentication/i,
    /authorization/i,
    /session/i,
    /database.*connection/i,
    /mongodb/i,
    /redis/i,
    /internal.*error/i,
  ];

  // Error codes that indicate security incidents
  private readonly securityErrorCodes = [
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.METHOD_NOT_ALLOWED,
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  ];

  // Production-safe error messages
  private readonly safeErrorMessages = {
    [HttpStatus.BAD_REQUEST]: 'Invalid request parameters',
    [HttpStatus.UNAUTHORIZED]: 'Authentication required',
    [HttpStatus.FORBIDDEN]: 'Access denied',
    [HttpStatus.NOT_FOUND]: 'Resource not found',
    [HttpStatus.METHOD_NOT_ALLOWED]: 'Method not allowed',
    [HttpStatus.CONFLICT]: 'Resource conflict',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'Validation failed',
    [HttpStatus.TOO_MANY_REQUESTS]: 'Rate limit exceeded',
    [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'Unsupported content type',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal server error',
    [HttpStatus.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
    [HttpStatus.GATEWAY_TIMEOUT]: 'Request timeout',
  };

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract security context
    const securityContext = this.extractSecurityContext(request);

    // Determine the error type and status
    const errorInfo = this.analyzeException(exception);

    // Create standardized error response
    const errorResponse = this.createErrorResponse(
      errorInfo,
      request,
      securityContext
    );

    // Log the error appropriately
    this.logError(exception, errorInfo, securityContext, errorResponse);

    // Security event logging for sensitive errors
    if (this.isSecurityError(errorInfo.statusCode)) {
      this.logSecurityEvent(exception, errorInfo, securityContext);
    }

    // Audit logging for compliance
    this.logAuditEvent(exception, errorInfo, securityContext, errorResponse);

    // Send response with appropriate security measures
    this.sendErrorResponse(response, errorResponse, errorInfo);
  }

  private extractSecurityContext(request: Request): SecurityContext {
    const logContext = (request as any).logContext;
    const user = (request as any).user;

    return {
      requestId: logContext?.requestId || this.generateId('req'),
      correlationId: logContext?.correlationId || this.generateId('corr'),
      clientIp: logContext?.clientIp || request.ip || 'unknown',
      userAgent: request.get('User-Agent') || 'Unknown',
      userId: user?.id || user?.sub,
      username: user?.username,
      path: request.path,
      method: request.method,
    };
  }

  private analyzeException(exception: any): {
    statusCode: number;
    message: string;
    error: string;
    isOperational: boolean;
    errorType: string;
    originalError?: any;
  } {
    // Handle NestJS HTTP Exceptions
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();

      if (typeof response === 'object' && response !== null) {
        return {
          statusCode: status,
          message: (response as any).message || exception.message,
          error: (response as any).error || exception.name,
          isOperational: true,
          errorType: 'HttpException',
          originalError: response,
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: exception.name,
        isOperational: true,
        errorType: 'HttpException',
      };
    }

    // Handle MongoDB/Mongoose Errors
    if (exception instanceof MongoError || exception.name?.includes('Mongo')) {
      return this.handleDatabaseError(exception);
    }

    // Handle Mongoose Validation Errors
    if (exception instanceof MongooseError.ValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'ValidationError',
        isOperational: true,
        errorType: 'ValidationError',
        originalError: exception,
      };
    }

    // Handle JWT Errors
    if (exception.name === 'JsonWebTokenError') {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid authentication token',
        error: 'Unauthorized',
        isOperational: true,
        errorType: 'JWTError',
      };
    }

    if (exception.name === 'TokenExpiredError') {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Authentication token expired',
        error: 'Unauthorized',
        isOperational: true,
        errorType: 'JWTError',
      };
    }

    // Handle Rate Limiting Errors
    if (exception.message?.includes('Too Many Requests')) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded',
        error: 'TooManyRequests',
        isOperational: true,
        errorType: 'RateLimitError',
      };
    }

    // Handle Validation Pipe Errors
    if (exception.name === 'BadRequestException' && exception.response?.message) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: Array.isArray(exception.response.message)
          ? exception.response.message.join(', ')
          : exception.response.message,
        error: 'BadRequest',
        isOperational: true,
        errorType: 'ValidationError',
        originalError: exception.response,
      };
    }

    // Handle unknown/unexpected errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'InternalServerError',
      isOperational: false,
      errorType: 'UnhandledError',
      originalError: exception,
    };
  }

  private handleDatabaseError(exception: any): {
    statusCode: number;
    message: string;
    error: string;
    isOperational: boolean;
    errorType: string;
    originalError?: any;
  } {
    // MongoDB duplicate key error
    if (exception.code === 11000) {
      const field = this.extractDuplicateField(exception);
      return {
        statusCode: HttpStatus.CONFLICT,
        message: `${field} already exists`,
        error: 'Conflict',
        isOperational: true,
        errorType: 'DuplicateKeyError',
      };
    }

    // MongoDB connection errors
    if (exception.name === 'MongoNetworkError' || exception.name === 'MongoTimeoutError') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database temporarily unavailable',
        error: 'ServiceUnavailable',
        isOperational: true,
        errorType: 'DatabaseConnectionError',
      };
    }

    // MongoDB validation errors
    if (exception.name === 'MongoServerError' && exception.code === 121) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Data validation failed',
        error: 'ValidationError',
        isOperational: true,
        errorType: 'DatabaseValidationError',
      };
    }

    // Generic database error
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      error: 'DatabaseError',
      isOperational: false,
      errorType: 'DatabaseError',
      originalError: exception,
    };
  }

  private createErrorResponse(
    errorInfo: any,
    request: Request,
    securityContext: SecurityContext
  ): ErrorResponse {
    const isProduction = process.env.NODE_ENV === 'production';
    const includeDetails = !isProduction || this.shouldIncludeDetails(errorInfo);

    // Use safe error message in production for security
    const message = isProduction && this.isSensitiveError(errorInfo.message)
      ? (this.safeErrorMessages as any)[errorInfo.statusCode] || 'An error occurred'
      : errorInfo.message;

    const errorResponse: ErrorResponse = {
      statusCode: errorInfo.statusCode,
      message,
      error: errorInfo.error,
      timestamp: new Date().toISOString(),
      path: request.path,
      requestId: securityContext.requestId,
      correlationId: securityContext.correlationId,
    };

    // Include validation details for client-side handling
    if (errorInfo.errorType === 'ValidationError' && errorInfo.originalError) {
      errorResponse.validation = this.extractValidationErrors(errorInfo.originalError);
    }

    // Include additional details in development
    if (includeDetails) {
      errorResponse.details = this.sanitizeErrorDetails(errorInfo.originalError);
    }

    // Include stack trace only in development
    if (!isProduction && errorInfo.originalError?.stack) {
      errorResponse.stack = errorInfo.originalError.stack;
    }

    return errorResponse;
  }

  private logError(
    exception: any,
    errorInfo: any,
    securityContext: SecurityContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _errorResponse: ErrorResponse
  ): void {
    const logContext = {
      ...securityContext,
      statusCode: errorInfo.statusCode,
      errorType: errorInfo.errorType,
      isOperational: errorInfo.isOperational,
      errorMessage: errorInfo.message,
    };

    if (errorInfo.statusCode >= 500) {
      this.logger.error(
        `Server Error: ${errorInfo.message}`,
        {
          ...logContext,
          stack: exception?.stack,
          originalError: this.sanitizeErrorDetails(exception),
        }
      );
    } else if (errorInfo.statusCode >= 400) {
      this.logger.warn(
        `Client Error: ${errorInfo.message}`,
        logContext
      );
    } else {
      this.logger.log(
        `Handled Exception: ${errorInfo.message}`,
        logContext
      );
    }
  }

  private logSecurityEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _exception: any,
    errorInfo: any,
    securityContext: SecurityContext
  ): void {
    const securityEvent = {
      type: 'security_error',
      ...securityContext,
      errorCode: errorInfo.statusCode,
      errorType: errorInfo.errorType,
      message: errorInfo.message,
      severity: this.getSecuritySeverity(errorInfo.statusCode),
      timestamp: new Date().toISOString(),
      potentialThreat: this.assessSecurityThreat(errorInfo, securityContext),
    };

    this.securityLogger.warn(`Security Event: ${errorInfo.statusCode} - ${errorInfo.message}`, securityEvent);

    // Alert on multiple security errors from same IP
    this.checkForSecurityPatterns(securityContext);
  }

  private logAuditEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _exception: any,
    errorInfo: any,
    securityContext: SecurityContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _errorResponse: ErrorResponse
  ): void {
    // Only audit errors for sensitive operations
    const shouldAudit = this.shouldAuditError(securityContext.path, errorInfo.statusCode);

    if (shouldAudit) {
      const auditEvent = {
        type: 'error_audit',
        ...securityContext,
        operation: `${securityContext.method} ${securityContext.path}`,
        errorCode: errorInfo.statusCode,
        errorType: errorInfo.errorType,
        success: false,
        compliance: {
          dataAccess: this.getDataAccessTypes(securityContext.path),
          errorLogged: true,
          auditRequired: true,
        },
        timestamp: new Date().toISOString(),
      };

      this.auditLogger.log(`Audit Error: ${errorInfo.statusCode} - ${securityContext.path}`, auditEvent);
    }
  }

  private sendErrorResponse(response: Response, errorResponse: ErrorResponse, errorInfo: any): void {
    // Security headers for error responses
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');

    // Rate limiting headers for 429 errors
    if (errorInfo.statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      response.setHeader('Retry-After', '900'); // 15 minutes
    }

    // Cache control for error responses
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

    response.status(errorInfo.statusCode).json(errorResponse);
  }

  private extractDuplicateField(exception: any): string {
    const message = exception.message || '';
    const match = message.match(/index: (.+?)_/);
    if (match && match[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
    return 'Field';
  }

  private extractValidationErrors(originalError: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (originalError?.errors) {
      // Mongoose validation errors
      for (const [field, error] of Object.entries(originalError.errors)) {
        errors.push({
          field,
          message: (error as any).message,
          value: (error as any).value,
        });
      }
    } else if (Array.isArray(originalError?.message)) {
      // Class-validator errors
      originalError.message.forEach((msg: string) => {
        const match = msg.match(/^(.+?) (.+)$/);
        if (match) {
          errors.push({
            field: match[1],
            message: match[2],
          });
        } else {
          errors.push({
            field: 'unknown',
            message: msg,
          });
        }
      });
    }

    return errors;
  }

  private sanitizeErrorDetails(error: any): any {
    if (!error) return null;

    // Remove sensitive information from error details
    const sanitized = { ...error };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential', 'connection'];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    // Remove stack traces from nested errors in production
    if (process.env.NODE_ENV === 'production') {
      delete sanitized.stack;
    }

    return sanitized;
  }

  private isSensitiveError(message: string): boolean {
    return this.sensitiveErrorPatterns.some(pattern => pattern.test(message));
  }

  private isSecurityError(statusCode: number): boolean {
    return this.securityErrorCodes.includes(statusCode);
  }

  private shouldIncludeDetails(errorInfo: any): boolean {
    // Include details for operational errors but not for security errors
    return errorInfo.isOperational && !this.isSecurityError(errorInfo.statusCode);
  }

  private shouldAuditError(path: string, statusCode: number): boolean {
    const auditPaths = ['/api/auth', '/api/users', '/api/customers', '/api/jobs'];
    const auditCodes = [401, 403, 409, 500];

    return auditPaths.some(auditPath => path.startsWith(auditPath)) ||
           auditCodes.includes(statusCode);
  }

  private getDataAccessTypes(path: string): string[] {
    const dataTypes: string[] = [];

    if (path.includes('/customers')) dataTypes.push('customer_data');
    if (path.includes('/jobs')) dataTypes.push('job_data');
    if (path.includes('/estimates')) dataTypes.push('estimate_data');
    if (path.includes('/auth')) dataTypes.push('auth_data');
    if (path.includes('/users')) dataTypes.push('user_data');

    return dataTypes;
  }

  private getSecuritySeverity(statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
    if (statusCode === 429) return 'high'; // Rate limiting
    if (statusCode === 403) return 'medium'; // Forbidden
    if (statusCode === 401) return 'medium'; // Unauthorized
    if (statusCode >= 500) return 'critical'; // Server errors
    return 'low';
  }

  private assessSecurityThreat(errorInfo: any, securityContext: SecurityContext): 'low' | 'medium' | 'high' {
    // Assess threat level based on error type and context
    if (errorInfo.statusCode === 429) return 'high'; // Rate limit abuse
    if (errorInfo.statusCode === 403 && securityContext.path.includes('/admin')) return 'high';
    if (errorInfo.statusCode === 401 && securityContext.path.includes('/auth')) return 'medium';
    if (errorInfo.statusCode >= 500) return 'high'; // Potential system compromise
    return 'low';
  }

  private checkForSecurityPatterns(securityContext: SecurityContext): void {
    // This would typically integrate with a security monitoring system
    // For now, just log repeated errors from the same IP
    // In a real implementation, this would use Redis or similar
    // to track error patterns across multiple instances
    this.logger.debug(`Security pattern check for IP: ${securityContext.clientIp}`);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check method for monitoring
  getErrorStatistics(): {
    totalErrors: number;
    securityErrors: number;
    serverErrors: number;
    clientErrors: number;
    lastError?: Date;
  } {
    // This would typically come from metrics storage
    return {
      totalErrors: 0,
      securityErrors: 0,
      serverErrors: 0,
      clientErrors: 0,
    };
  }
}