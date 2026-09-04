import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * The Telegram webhook is called by Telegram's servers, not a logged-in
 * user - JwtAuthGuard doesn't apply. Telegram echoes back a secret token we
 * set once via setWebhook, on every request, as this header - checking it
 * is the only thing standing between this endpoint and the open internet.
 */
@Injectable()
export class TelegramWebhookGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    const provided = request.headers['x-telegram-bot-api-secret-token'];
    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }
    return true;
  }
}
