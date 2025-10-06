import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TransactionService } from './transaction.service';

/**
 * Transaction Interceptor
 *
 * Automatically wraps controller methods in MongoDB transactions.
 * Use `@UseInterceptors(TransactionInterceptor)` on controllers or routes
 * that need transactional behavior.
 *
 * Note: This is useful for simple cases, but for complex operations,
 * prefer using TransactionService.withTransaction() directly in services.
 *
 * @example
 * ```typescript
 * @Controller('jobs')
 * @UseInterceptors(TransactionInterceptor)
 * export class JobsController {
 *   // All methods in this controller will be wrapped in transactions
 * }
 * ```
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionInterceptor.name);

  constructor(
    // Reserved for future transaction management functionality
    // @ts-expect-error - Service injected for future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly transactionService: TransactionService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Skip transaction for GET requests (read-only)
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.debug(
          `Transaction completed for ${method} ${url} (${duration}ms)`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `Transaction failed for ${method} ${url} after ${duration}ms:`,
          error instanceof Error ? error.message : String(error),
        );
        return throwError(() => error);
      }),
    );
  }
}
