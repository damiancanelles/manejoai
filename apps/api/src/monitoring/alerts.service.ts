import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * "Tell Damian something broke" - so a crash or a failed customer email is
 * heard about before a customer mentions it. No third-party error tracker
 * (and no new dependency): every alert is
 *  - always logged at error level with an [ALERT] prefix (searchable in
 *    `heroku logs`, and what a log-based alert would match on),
 *  - emailed to ALERT_EMAIL (comma-separated) when set,
 *  - POSTed as {"text": "..."} to ALERT_WEBHOOK_URL when set (a Slack or
 *    Discord incoming webhook works as-is) - this one still arrives when
 *    the email provider itself is what's down.
 *
 * Throttled so a crash loop can't flood the inbox: the same alert key is
 * sent at most once per ALERT_THROTTLE_MINUTES (default 15), and at most
 * ALERT_MAX_PER_HOUR alerts (default 20) go out in total per hour.
 * Everything here is best-effort - an alert that fails to send is logged
 * and swallowed, it never throws back into the code that raised it.
 */
@Injectable()
export class AlertsService {
  private logger = new Logger('Alerts');
  private lastSentByKey = new Map<string, number>();
  private sentThisHour: number[] = [];

  constructor(
    private config: ConfigService,
    private mail: MailService,
  ) {
    // MailService can't depend on this service (this one sends through it),
    // so it reports failed sends through a listener instead.
    this.mail.setFailureListener((info) => {
      void this.notify(`Email send failed: ${info.subject}`, `To: ${info.to}\n${info.error}`, `mail:${info.status}`);
    });
  }

  private shouldSend(key: string): boolean {
    const now = Date.now();
    const throttleMs = Number(this.config.get('ALERT_THROTTLE_MINUTES', 15)) * 60_000;
    const maxPerHour = Number(this.config.get('ALERT_MAX_PER_HOUR', 20));

    const last = this.lastSentByKey.get(key);
    if (last && now - last < throttleMs) return false;

    this.sentThisHour = this.sentThisHour.filter((t) => now - t < 3_600_000);
    if (this.sentThisHour.length >= maxPerHour) return false;

    this.lastSentByKey.set(key, now);
    this.sentThisHour.push(now);
    return true;
  }

  /** Report a problem. `key` groups repeats of the same problem for throttling (defaults to the title). */
  async notify(title: string, details = '', key?: string): Promise<void> {
    const trimmedDetails = details.slice(0, 4000);
    this.logger.error(`[ALERT] ${title}${trimmedDetails ? `\n${trimmedDetails}` : ''}`);

    if (!this.shouldSend(key ?? title)) return;

    const env = this.config.get<string>('ALERT_ENV_NAME', 'production');
    const subject = `[manejoai ${env}] ${title}`.slice(0, 200);

    const recipients = (this.config.get<string>('ALERT_EMAIL') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const to of recipients) {
      try {
        await this.mail.send({
          to,
          subject,
          html: `<pre style="font-family:monospace;white-space:pre-wrap">${escapeHtml(trimmedDetails || title)}</pre>`,
          // A failed alert email must not raise another alert (loop).
          skipFailureAlert: true,
        });
      } catch (err) {
        this.logger.error(`Could not email alert to ${to}: ${(err as Error).message}`);
      }
    }

    const webhookUrl = this.config.get<string>('ALERT_WEBHOOK_URL');
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${subject}\n${trimmedDetails}`.slice(0, 1900), content: `${subject}\n${trimmedDetails}`.slice(0, 1900) }),
        });
        if (!res.ok) this.logger.error(`Alert webhook returned ${res.status}`);
      } catch (err) {
        this.logger.error(`Could not post alert webhook: ${(err as Error).message}`);
      }
    }
  }
}
