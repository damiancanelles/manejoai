import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Platform-only routes (see platform/) - apply alongside JwtAuthGuard
 * (@UseGuards(JwtAuthGuard, SuperAdminGuard)), which runs first and
 * populates request.user; this just checks the role on top of that.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Super-admin access required');
    }
    return true;
  }
}
