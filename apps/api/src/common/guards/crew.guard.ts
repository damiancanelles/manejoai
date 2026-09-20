import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Blocks the CREW role from every route it applies to - crew accounts can
 * only reach the handful of routes that deliberately omit this guard
 * (job-report submission, clock in/out, their own password/push-token).
 * Apply alongside JwtAuthGuard (@UseGuards(JwtAuthGuard, CrewGuard, ...)),
 * which runs first and populates request.user.
 */
@Injectable()
export class CrewGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role === 'CREW') {
      throw new ForbiddenException('Not available to crew accounts');
    }
    return true;
  }
}
