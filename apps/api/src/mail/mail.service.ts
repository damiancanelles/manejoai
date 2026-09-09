import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  // The business this email is on behalf of - drives who Resend says it's
  // from (<emailSlug>@manejoai.cloud, display-named after the business) and
  // where replies land (replyToEmail). Every business gets its own
  // recognizable sending address this way without needing to verify its
  // own domain in Resend. Omit only for a true system-level email with no
  // single business behind it - falls back to the MAIL_FROM/MAIL_REPLY_TO
  // env vars, which is all this app had before businesses existed.
  business?: { name: string; emailSlug: string; replyToEmail?: string | null };
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

  private resolveFrom(business?: SendEmailInput['business']): string {
    if (business) {
      const domain = this.config.get<string>('MAIL_SENDING_DOMAIN', 'manejoai.cloud');
      return `${business.name} <${business.emailSlug}@${domain}>`;
    }
    return this.config.get<string>('MAIL_FROM') ?? '';
  }

  private resolveReplyTo(business?: SendEmailInput['business']): string | undefined {
    return business?.replyToEmail || this.config.get<string>('MAIL_REPLY_TO');
  }

  async send(rawInput: SendEmailInput): Promise<void> {
    // Optional - set on staging/test environments so a real send is always
    // visually distinguishable from a production one, even if it reuses the
    // same Resend key/from address.
    const prefix = this.config.get<string>('MAIL_SUBJECT_PREFIX');
    const input = prefix ? { ...rawInput, subject: `${prefix}${rawInput.subject}` } : rawInput;

    if (this.driver === 'resend') {
      return this.sendViaResend(input);
    }
    const attachmentNote = input.attachments?.length
      ? ` | Attachments: ${input.attachments.map((a) => a.filename).join(', ')}`
      : '';
    this.logger.log(
      `[console-mail] From: ${this.resolveFrom(input.business)} | To: ${input.to} | Subject: ${input.subject}${attachmentNote}\n${input.html}`,
    );
  }

  private async sendViaResend(input: SendEmailInput): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.resolveFrom(input.business);
    // Optional (or business.replyToEmail) - lets replies land in an inbox
    // someone actually checks even though `from` has to be an address on a
    // domain we actually control (see the comment on MAIL_SENDING_DOMAIN -
    // no provider can legitimately send "as" someone else's address).
    const replyTo = this.resolveReplyTo(input.business);
    if (!apiKey) {
      this.logger.warn('MAIL_DRIVER=resend but RESEND_API_KEY is not set - falling back to console log');
      this.logger.log(`[console-mail] From: ${from} | To: ${input.to} | Subject: ${input.subject}\n${input.html}`);
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
        ...(replyTo ? { reply_to: replyTo } : {}),
        // Resend wants attachment content as base64 (https://resend.com/docs/api-reference/emails/send-email)
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
        })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend send failed (${res.status}): ${body}`);
    }
  }
}
