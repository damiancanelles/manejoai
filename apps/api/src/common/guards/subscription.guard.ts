import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isBusinessSubscribed } from '../subscription';

/**
 * Hard-locks business-data routes once a business's subscription has
 * lapsed - trial ran out unpaid, or a renewal failed. Apply alongside
 * JwtAuthGuard (@UseGuards(JwtAuthGuard, SubscriptionGuard)), which runs
 * first and populates request.user.
 *
 * SUPERADMIN is exempt unconditionally - the internal "Manejoai Platform"
 * business it belongs to isn't a real tenant. Deliberately NOT applied to
 * BusinessesController (a lapsed business still needs to see its own
 * info/status) or the billing checkout/portal routes (that's how a lapsed
 * business resubscribes in the first place).
 *
 * This only covers HTTP routes a logged-in user hits directly - the
 * reminder cron and incoming Telegram messages run on their own
 * schedule/trigger with no request to guard, so they check
 * isBusinessSubscribed() themselves (see RemindersService, TelegramService).
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user?.role === 'SUPERADMIN') return true;

    const business = await this.prisma.business.findUnique({
      where: { id: user.businessId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    });

    if (business && isBusinessSubscribed(business)) return true;

    throw new HttpException(
      { message: 'Subscription required', statusCode: HttpStatus.PAYMENT_REQUIRED },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
