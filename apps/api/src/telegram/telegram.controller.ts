import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TelegramWebhookGuard } from './telegram-webhook.guard';
import { TelegramService } from './telegram.service';
import { TelegramSetupService } from './telegram-setup.service';
import { SaveTelegramTokenDto } from './dto';
import { TelegramUpdate } from './types';

@Controller('telegram')
export class TelegramController {
  constructor(
    private telegramService: TelegramService,
    private telegramSetupService: TelegramSetupService,
  ) {}

  // Note: no JwtAuthGuard here on purpose - Telegram's servers call this, not
  // a logged-in user. TelegramWebhookGuard checks that business's own secret
  // token instead (see that file). `update` is typed as a plain interface
  // (not a class DTO) so the global ValidationPipe (whitelist/
  // forbidNonWhitelisted) skips it entirely.
  @UseGuards(TelegramWebhookGuard)
  @Post('webhook/:businessId')
  async webhook(@Param('businessId') businessId: string, @Body() update: TelegramUpdate) {
    await this.telegramService.handleUpdate(businessId, update);
    return { ok: true };
  }

  // ---- Self-service setup, one business at a time (see TelegramSetupService) ----

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @Get('me/status')
  getStatus(@CurrentUser() user: { businessId: string }) {
    return this.telegramSetupService.getStatus(user.businessId);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @Patch('me/token')
  saveToken(@Body() dto: SaveTelegramTokenDto, @CurrentUser() user: { businessId: string }) {
    return this.telegramSetupService.saveToken(user.businessId, dto.botToken);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @Post('me/confirm')
  confirm(@CurrentUser() user: { businessId: string }) {
    return this.telegramSetupService.confirm(user.businessId);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @Delete('me/token')
  removeToken(@CurrentUser() user: { businessId: string }) {
    return this.telegramSetupService.removeToken(user.businessId);
  }
}
