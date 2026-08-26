import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ContactRole, InvoiceStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/**
 * Payment follow-up automation, per Damian's description of the process:
 *  - Invoice goes out (status SENT).
 *  - Once it's past due, it's OVERDUE (there's no real "1-2 day grace" in
 *    practice - see REMINDER_GRACE_PERIOD_DAYS below for the wait before the
 *    *first* reminder, which is the "couple of weeks" he mentioned).
 *  - After that first reminder, follow-ups repeat every
 *    REMINDER_FOLLOWUP_INTERVAL_DAYS (his "every week or two weeks") until
 *    the invoice is marked PAID or CANCELED.
 */
@Injectable()
export class RemindersService {
  private logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  // Runs every day at 8am server time. Change the cron expression, or trigger
  // manually via POST /api/reminders/run while testing.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDaily() {
    await this.flagOverdueInvoices();
    await this.sendDueReminders();
  }

  /** SENT invoices whose due date has passed become OVERDUE. */
  async flagOverdueInvoices() {
    const result = await this.prisma.invoice.updateMany({
      where: { status: InvoiceStatus.SENT, dueDate: { lt: new Date() } },
      data: { status: InvoiceStatus.OVERDUE },
    });
    if (result.count > 0) {
      this.logger.log(`Flagged ${result.count} invoice(s) as OVERDUE`);
    }
    return result.count;
  }

  /** Sends a reminder email for every OVERDUE invoice that's due for one. */
  async sendDueReminders() {
    const gracePeriodDays = Number(this.config.get('REMINDER_GRACE_PERIOD_DAYS', 14));
    const followupIntervalDays = Number(this.config.get('REMINDER_FOLLOWUP_INTERVAL_DAYS', 14));

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.OVERDUE },
      include: {
        account: { include: { contacts: true } },
        reminders: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
    });

    let sentCount = 0;
    const now = Date.now();

    for (const invoice of overdueInvoices) {
      const lastReminder = invoice.reminders[0];
      const daysPastDue = (now - invoice.dueDate.getTime()) / 86_400_000;

      const dueForFirstReminder = !lastReminder && daysPastDue >= gracePeriodDays;
      const dueForFollowup =
        !!lastReminder &&
        (now - lastReminder.sentAt.getTime()) / 86_400_000 >= followupIntervalDays;

      if (!dueForFirstReminder && !dueForFollowup) continue;

      const recipients = invoice.account.contacts.filter(
        (c) => c.receivesReminders || c.role === ContactRole.INVOICING,
      );
      if (recipients.length === 0) {
        this.logger.warn(
          `Invoice ${invoice.invoiceNumber} is overdue but account "${invoice.account.name}" has no contact marked to receive reminders - skipping`,
        );
        continue;
      }

      const amount = (invoice.amountCents / 100).toFixed(2);
      const subject = `Payment reminder: invoice ${invoice.invoiceNumber} is past due`;
      const html = `
        <p>Hi,</p>
        <p>This is a reminder that invoice <strong>${invoice.invoiceNumber}</strong>
        for <strong>$${amount}</strong> (due ${invoice.dueDate.toDateString()}) has not
        yet been paid.</p>
        <p>Please remit payment at your earliest convenience. Reply to this email
        with any questions.</p>
      `;

      for (const contact of recipients) {
        if (!contact.email) continue;
        await this.mail.send({ to: contact.email, subject, html });
        await this.prisma.reminderLog.create({
          data: { invoiceId: invoice.id, toEmail: contact.email, subject },
        });
        sentCount++;
      }
    }

    if (sentCount > 0) this.logger.log(`Sent ${sentCount} reminder email(s)`);
    return sentCount;
  }
}
