import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Gates Pro-only features (the AI assistant) on top of SubscriptionGuard.
 * Apply as @UseGuards(JwtAuthGuard, SubscriptionGuard, ProTierGuard) - the
 * first two run first (auth + "is the app unlocked at all"), this one just
 * checks the plan tier. A fresh business trials on Pro; the webhook flips
 * subscriptionTier to "basic" only if they subscribe to the $5 plan.
 * SUPERADMIN is exempt, same as SubscriptionGuard.
 */
@Injectable()
export class ProTierGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user?.role === 'SUPERADMIN') return true;

    const business = await this.prisma.business.findUnique({
      where: { id: user.businessId },
      select: { subscriptionTier: true },
    });

    if (business?.subscriptionTier === 'pro') return true;

    throw new HttpException(
      { message: 'The assistant is part of the Pro plan.', statusCode: HttpStatus.FORBIDDEN },
      HttpStatus.FORBIDDEN,
    );
  }
}
