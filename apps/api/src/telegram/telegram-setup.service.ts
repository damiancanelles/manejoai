import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Self-service Telegram bot setup, one per business: validates the token a
 * business pastes in from @BotFather, registers this business's own webhook
 * URL with Telegram (replacing the old single global TELEGRAM_BOT_TOKEN/
 * TELEGRAM_WEBHOOK_SECRET env vars with per-business columns on Business),
 * and tracks the manual steps Telegram gives no API to verify (privacy
 * mode, being added to the group) via a self-reported confirmation.
 */
@Injectable()
export class TelegramSetupService {
  private logger = new Logger(TelegramSetupService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Safe-to-return view of a business's setup - never the raw token. */
  async getStatus(businessId: string) {
    const b = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    return {
      hasToken: !!b.telegramBotToken,
      botUsername: b.telegramBotUsername,
      groupTitle: b.telegramGroupTitle,
      groupLinked: !!b.telegramGroupChatId,
      confirmedAt: b.telegramConfirmedAt,
    };
  }

  /**
   * Validates the token via Telegram's getMe, points Telegram at this
   * business's own webhook URL, and saves everything. Resets the group
   * link/confirmation - a freshly saved token is a different bot that
   * hasn't been added to any group yet.
   */
  async saveToken(businessId: string, rawToken: string) {
    const token = rawToken.trim();

    const me = await this.callTelegram(token, 'getMe');
    if (!me?.ok) {
      throw new BadRequestException(
        "That doesn't look like a valid bot token - double-check it against the one @BotFather gave you.",
      );
    }

    const publicApiUrl = this.config.get<string>('PUBLIC_API_URL');
    if (!publicApiUrl) {
      throw new BadRequestException('The server has no PUBLIC_API_URL configured - contact support.');
    }

    const webhookSecret = crypto.randomBytes(24).toString('hex');
    const webhookUrl = `${publicApiUrl.replace(/\/$/, '')}/api/telegram/webhook/${businessId}`;
    const setResult = await this.callTelegram(token, 'setWebhook', { url: webhookUrl, secret_token: webhookSecret });
    if (!setResult?.ok) {
      this.logger.error(`setWebhook failed for business ${businessId}: ${JSON.stringify(setResult)}`);
      throw new BadRequestException(
        `Telegram accepted the token but rejected the webhook setup: ${setResult?.description ?? 'unknown error'}`,
      );
    }

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        telegramBotToken: token,
        telegramBotUsername: me.result.username ?? null,
        telegramWebhookSecret: webhookSecret,
        telegramGroupChatId: null,
        telegramGroupTitle: null,
        telegramConfirmedAt: null,
      },
    });

    return this.getStatus(businessId);
  }

  /** The "I've completed these steps" button - self-reported, nothing to verify server-side. */
  async confirm(businessId: string) {
    await this.prisma.business.update({ where: { id: businessId }, data: { telegramConfirmedAt: new Date() } });
    return this.getStatus(businessId);
  }

  /** Disconnects the bot - lets a business start over with a different token. */
  async removeToken(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (business?.telegramBotToken) {
      // Best-effort - don't fail the request just because Telegram's side errored.
      await this.callTelegram(business.telegramBotToken, 'deleteWebhook').catch(() => undefined);
    }
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        telegramBotToken: null,
        telegramBotUsername: null,
        telegramWebhookSecret: null,
        telegramGroupChatId: null,
        telegramGroupTitle: null,
        telegramConfirmedAt: null,
      },
    });
    return this.getStatus(businessId);
  }

  private async callTelegram(token: string, method: string, body?: Record<string, unknown>): Promise<any> {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    try {
      const res = body
        ? await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(url);
      return await res.json();
    } catch (err) {
      this.logger.error(`Telegram API call (${method}) failed: ${(err as Error).message}`);
      return { ok: false, description: (err as Error).message };
    }
  }
}
