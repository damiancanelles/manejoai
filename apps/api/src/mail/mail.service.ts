import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin abstraction over "however we actually send email" so the reminder
 * scheduler doesn't care which provider is behind it.
 *
 * MAIL_DRIVER=console (default): logs the email instead of sending it. Safe
 * to run against real invoice data without spamming anyone while you finish
 * wiring things up.
 *
 * MAIL_DRIVER=resend: sends via Resend's HTTP API (https://resend.com). Swap
 * in Postmark/SendGrid the same way if you'd rather use one of those - only
 * this file changes.
 */
@Injectable()
export class MailService {
  private logger = new Logger(MailService.name);
  private driver: string;

  constructor(private config: ConfigService) {
    this.driver = this.config.get<string>('MAIL_DRIVER', 'console');
  }

  async send(input: SendEmailInput): Promise<void> {
    if (this.driver === 'resend') {
      return this.sendViaResend(input);
    }
    this.logger.log(`[console-mail] To: ${input.to} | Subject: ${input.subject}\n${input.html}`);
  }

  private async sendViaResend(input: SendEmailInput): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM');
    if (!apiKey) {
      this.logger.warn('MAIL_DRIVER=resend but RESEND_API_KEY is not set - falling back to console log');
      this.logger.log(`[console-mail] To: ${input.to} | Subject: ${input.subject}\n${input.html}`);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend send failed (${res.status}): ${body}`);
    }
  }
}
