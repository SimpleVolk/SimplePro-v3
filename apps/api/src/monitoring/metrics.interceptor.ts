import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const { method, url } = request;

    // Remove query parameters for cleaner metrics
    const path = url.split('?')[0];

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.metricsService.recordHttpRequest(
            method,
            path,
            response.statusCode,
            duration,
          );
        },
        error: () => {
          const duration = Date.now() - startTime;
          this.metricsService.recordHttpRequest(
            method,
            path,
            response.statusCode || 500,
            duration,
          );
        },
      }),
    );
  }
}
