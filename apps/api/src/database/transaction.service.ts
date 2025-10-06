import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';

// Simplified transaction options interface
interface TransactionOptions {
  readPreference?: string;
  readConcern?: any;
  writeConcern?: any;
  maxCommitTimeMS?: number;
}

/**
 * Transaction Service
 *
 * Provides a wrapper for MongoDB transactions with automatic retry logic
 * and error handling. Use this for multi-document operations that need
 * ACID guarantees.
 *
 * @example
 * ```typescript
 * await this.transactionService.withTransaction(async (session) => {
 *   await this.model1.create([data1], { session });
 *   await this.model2.updateOne({ _id: id }, update, { session });
 *   return result;
 * });
 * ```
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly defaultOptions: any;

  constructor(@InjectConnection() private readonly connection: Connection) {
    // Default transaction options
    this.defaultOptions = {
      readPreference: 'primary',
      maxCommitTimeMS: 10000, // 10 seconds
    };
  }

  /**
   * Execute an operation within a MongoDB transaction with automatic retry logic
   *
   * @param operation - Async function that receives a ClientSession and returns a result
   * @param options - Optional transaction configuration
   * @param maxRetries - Maximum number of retry attempts for transient errors (default: 3)
   * @returns Promise resolving to the operation result
   *
   * @throws Error if transaction fails after all retry attempts
   */
  async withTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
    options?: TransactionOptions,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    const txOptions = { ...this.defaultOptions, ...options };

    while (attempt < maxRetries) {
      attempt++;
      const session = await this.connection.startSession();

      try {
        this.logger.debug(`Starting transaction attempt ${attempt}/${maxRetries}`);

        // Start transaction
        session.startTransaction(txOptions);

        // Execute the operation
        const startTime = Date.now();
        const result = await operation(session);
        const duration = Date.now() - startTime;

        // Commit transaction
        await session.commitTransaction();

        this.logger.debug(
          `Transaction committed successfully on attempt ${attempt} (duration: ${duration}ms)`,
        );

        return result;
      } catch (error) {
        lastError = error as Error;

        this.logger.warn(
          `Transaction attempt ${attempt}/${maxRetries} failed:`,
          error instanceof Error ? error.message : String(error),
        );

        // Abort transaction on error
        try {
          await session.abortTransaction();
          this.logger.debug('Transaction aborted successfully');
        } catch (abortError) {
          this.logger.error('Failed to abort transaction:', abortError);
        }

        // Check if error is retryable
        if (!this.isTransientError(error) || attempt >= maxRetries) {
          // Not a transient error or max retries reached
          this.logger.error(
            `Transaction failed permanently after ${attempt} attempts:`,
            error,
          );
          throw error;
        }

        // Exponential backoff before retry
        const backoffMs = this.calculateBackoff(attempt);
        this.logger.debug(`Retrying transaction after ${backoffMs}ms backoff`);
        await this.sleep(backoffMs);
      } finally {
        // Always end the session
        await session.endSession();
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Transaction failed for unknown reason');
  }

  /**
   * Check if an error is transient and can be retried
   *
   * Transient errors include:
   * - WriteConflict errors (concurrent modifications)
   * - TransientTransactionError (temporary network issues)
   * - UnknownTransactionCommitResult (commit status uncertain)
   */
  private isTransientError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || '';
    const errorCode = error.code;
    const errorLabels = error.errorLabels || [];

    // Check for MongoDB transient transaction errors
    if (errorLabels.includes('TransientTransactionError')) {
      return true;
    }

    if (errorLabels.includes('UnknownTransactionCommitResult')) {
      return true;
    }

    // Check for write conflict errors
    if (errorCode === 112 || errorMessage.includes('WriteConflict')) {
      return true;
    }

    // Check for snapshot errors
    if (errorCode === 246 || errorMessage.includes('SnapshotUnavailable')) {
      return true;
    }

    // Check for lock timeout errors
    if (errorCode === 50 || errorMessage.includes('LockTimeout')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   *
   * Formula: min(initialDelay * 2^(attempt-1), maxDelay)
   * - Attempt 1: 100ms
   * - Attempt 2: 200ms
   * - Attempt 3: 400ms
   */
  private calculateBackoff(attempt: number): number {
    const initialDelay = 100; // 100ms
    const maxDelay = 1000; // 1 second
    const delay = initialDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a manual session for custom transaction control
   *
   * Use this when you need fine-grained control over transaction lifecycle.
   * Remember to call session.endSession() when done.
   *
   * @example
   * ```typescript
   * const session = await this.transactionService.startSession();
   * try {
   *   session.startTransaction();
   *   // ... operations ...
   *   await session.commitTransaction();
   * } catch (error) {
   *   await session.abortTransaction();
   *   throw error;
   * } finally {
   *   await session.endSession();
   * }
   * ```
   */
  async startSession(): Promise<ClientSession> {
    return this.connection.startSession();
  }

  /**
   * Get transaction statistics for monitoring
   *
   * Note: This requires MongoDB server-side monitoring to be enabled
   */
  async getTransactionStats(): Promise<any> {
    try {
      const adminDb = this.connection.db?.admin();
      if (!adminDb) {
        throw new Error('Database not initialized');
      }
      const serverStatus = await adminDb.serverStatus();

      return {
        currentActive: serverStatus.transactions?.currentActive || 0,
        currentInactive: serverStatus.transactions?.currentInactive || 0,
        totalStarted: serverStatus.transactions?.totalStarted || 0,
        totalCommitted: serverStatus.transactions?.totalCommitted || 0,
        totalAborted: serverStatus.transactions?.totalAborted || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get transaction stats:', error);
      return null;
    }
  }
}
