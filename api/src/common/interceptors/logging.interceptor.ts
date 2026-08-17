import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: any): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const userAgent = headers['user-agent'];
    const requestId = headers['x-request-id'] || this.generateRequestId();

    const startTime = Date.now();

    this.logger.debug(`→ ${method} ${url}`, {
      requestId,
      userAgent,
      path: url,
      method,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        const logLevel = statusCode >= 500 ? 'error' : 'debug';
        this.logger[logLevel](`← ${statusCode} ${method} ${url}`, {
          requestId,
          statusCode,
          duration,
          method,
          path: url,
        });
      }),
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
