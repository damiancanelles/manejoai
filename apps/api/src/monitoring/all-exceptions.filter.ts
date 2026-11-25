import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import { AlertsService } from './alerts.service';

/**
 * Every unhandled error still gets Nest's normal response (BaseExceptionFilter
 * does exactly what Nest does without this filter) - this only adds an
 * alert for the ones that are our fault: anything that isn't an
 * HttpException, or is one with a 5xx status. A 400/401/404 is the client's
 * problem and stays quiet.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(private alerts: AlertsService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      let where = '';
      if (host.getType() === 'http') {
        const req = host.switchToHttp().getRequest<Request>();
        where = `${req.method} ${req.originalUrl?.split('?')[0] ?? ''}`;
      }
      void this.alerts.notify(
        `Server error${where ? ` on ${where}` : ''}: ${err.message}`.slice(0, 180),
        err.stack ?? err.message,
        `500:${where}:${err.message}`,
      );
    }
    super.catch(exception, host);
  }
}
