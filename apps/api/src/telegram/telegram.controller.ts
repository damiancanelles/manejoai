import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TelegramWebhookGuard } from './telegram-webhook.guard';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './types';

// Note: no JwtAuthGuard here on purpose - Telegram's servers call this, not
// a logged-in user. TelegramWebhookGuard checks Telegram's own secret token
// instead. `update` is typed as a plain interface (not a class DTO) so the
// global ValidationPipe (whitelist/forbidNonWhitelisted) skips it entirely.
@Controller('telegram')
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @UseGuards(TelegramWebhookGuard)
  @Post('webhook')
  async webhook(@Body() update: TelegramUpdate) {
    await this.telegramService.handleUpdate(update);
    return { ok: true };
  }
}
