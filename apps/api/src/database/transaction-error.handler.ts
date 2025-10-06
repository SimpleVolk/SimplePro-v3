import { Logger } from '@nestjs/common';

/**
 * Transaction Error Handler
 *
 * Centralized error handling for MongoDB transactions with
 * logging, metrics, and error categorization.
 */
export class TransactionErrorHandler {
  private static readonly logger = new Logger(TransactionErrorHandler.name);

  // Error counters for monitoring
  private static errorCounts = {
    transient: 0,
    writeConflict: 0,
    timeout: 0,
    validation: 0,
    other: 0,
  };

  /**
   * Handle transaction error and categorize it
   *
   * @param error - The error that occurred
   * @param context - Additional context for logging
   * @returns Error category
   */
  static handleError(error: any, context?: string): ErrorCategory {
    const category = this.categorizeError(error);
    this.incrementErrorCount(category);
    this.logError(error, category, context);
    return category;
  }

  /**
   * Categorize the error type
   */
  private static categorizeError(error: any): ErrorCategory {
    if (!error) return 'other';

    const errorMessage = error.message || '';
    const errorCode = error.code;
    const errorLabels = error.errorLabels || [];

    // Transient errors (retryable)
    if (
      errorLabels.includes('TransientTransactionError') ||
      errorLabels.includes('UnknownTransactionCommitResult')
    ) {
      return 'transient';
    }

    // Write conflict errors
    if (errorCode === 112 || errorMessage.includes('WriteConflict')) {
      return 'write_conflict';
    }

    // Timeout errors
    if (
      errorCode === 50 ||
      errorMessage.includes('LockTimeout') ||
      errorMessage.includes('MaxTimeMSExpired')
    ) {
      return 'timeout';
    }

    // Validation errors
    if (
      errorCode === 121 ||
      errorMessage.includes('ValidationError') ||
      errorMessage.includes('validation failed')
    ) {
      return 'validation';
    }

    return 'other';
  }

  /**
   * Increment error counter for monitoring
   */
  private static incrementErrorCount(category: ErrorCategory): void {
    switch (category) {
      case 'transient':
        this.errorCounts.transient++;
        break;
      case 'write_conflict':
        this.errorCounts.writeConflict++;
        break;
      case 'timeout':
        this.errorCounts.timeout++;
        break;
      case 'validation':
        this.errorCounts.validation++;
        break;
      default:
        this.errorCounts.other++;
    }
  }

  /**
   * Log error with appropriate severity
   */
  private static logError(
    error: any,
    category: ErrorCategory,
    context?: string,
  ): void {
    const contextStr = context ? ` [${context}]` : '';
    const errorMessage = error instanceof Error ? error.message : String(error);

    switch (category) {
      case 'transient':
      case 'write_conflict':
        // These are expected and will be retried
        this.logger.warn(
          `Retryable transaction error${contextStr}: ${errorMessage}`,
        );
        break;

      case 'timeout':
        // Timeouts may indicate performance issues
        this.logger.error(`Transaction timeout${contextStr}: ${errorMessage}`);
        break;

      case 'validation':
        // Validation errors indicate data issues
        this.logger.error(
          `Transaction validation error${contextStr}: ${errorMessage}`,
        );
        break;

      default:
        // Unknown errors should be investigated
        this.logger.error(`Unexpected transaction error${contextStr}:`, error);
    }
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): ErrorStats {
    return { ...this.errorCounts };
  }

  /**
   * Reset error counters (useful for testing)
   */
  static resetErrorStats(): void {
    this.errorCounts = {
      transient: 0,
      writeConflict: 0,
      timeout: 0,
      validation: 0,
      other: 0,
    };
  }

  /**
   * Format error for user-friendly response
   */
  static formatUserError(error: any, category: ErrorCategory): string {
    switch (category) {
      case 'transient':
      case 'write_conflict':
        return 'The operation is temporarily unavailable. Please try again.';

      case 'timeout':
        return 'The operation took too long to complete. Please try again or contact support.';

      case 'validation':
        return (
          error.message || 'Invalid data provided. Please check your input.'
        );

      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }
}

export type ErrorCategory =
  | 'transient'
  | 'write_conflict'
  | 'timeout'
  | 'validation'
  | 'other';

export interface ErrorStats {
  transient: number;
  writeConflict: number;
  timeout: number;
  validation: number;
  other: number;
}
