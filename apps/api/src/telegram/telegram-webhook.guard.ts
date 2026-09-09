import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The Telegram webhook is called by Telegram's servers, not a logged-in
 * user - JwtAuthGuard doesn't apply. Each business has its own bot and its
 * own webhook URL (/telegram/webhook/:businessId, see TelegramController),
 * so this looks up that business's own telegramWebhookSecret (set when they
 * saved their token - see TelegramSetupService) and checks it against the
 * secret Telegram echoes back on every call, instead of one shared env var.
 */
@Injectable()
export class TelegramWebhookGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const businessId = request.params?.businessId;
    const provided = request.headers['x-telegram-bot-api-secret-token'];

    if (!businessId || !provided) {
      throw new UnauthorizedException('Invalid Telegram webhook request');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { telegramWebhookSecret: true },
    });

    if (!business?.telegramWebhookSecret || provided !== business.telegramWebhookSecret) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }
    return true;
  }
}
