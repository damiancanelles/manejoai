import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ContactRole, InvoiceStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Payment follow-up automation, per Damian's description of the process:
 *  - Invoice goes out (status SENT).
 *  - Once it's past due, it's OVERDUE (there's no real "1-2 day grace" in
 *    practice - see REMINDER_GRACE_PERIOD_DAYS below for the wait before an
 *    invoice starts showing up in reminder emails at all, the "couple of
 *    weeks" he mentioned).
 *  - Once a week, every property (or whole account, for a contact with no
 *    property assigned) with overdue invoices gets ONE email listing all of
 *    them - not one email per invoice - to that property's contact. It just
 *    keeps showing up in each week's digest for as long as it's overdue, so
 *    there's no separate "follow-up interval" to track - the weekly cadence
 *    of the job itself is the follow-up.
 */
@Injectable()
export class RemindersService {
  private logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  // Flagging runs daily so the app's own displayed statuses (Dashboard,
  // Reports, the invoice itself) stay accurate day-to-day, independent of
  // how often we actually email about it.
  @Cron('0 8 * * *') // every day at 8am server time
  async runDailyFlagging() {
    await this.flagOverdueInvoices();
  }

  // The actual reminder emails go out once a week. Change the cron
  // expression to move the day/time, or trigger manually via
  // POST /api/reminders/run while testing.
  @Cron('0 8 * * 1') // every Monday at 8am server time
  async runWeeklyDigest() {
    await this.sendOverdueDigest();
  }

  /** SENT invoices whose due date has passed become OVERDUE. */
  async flagOverdueInvoices(accountId?: string) {
    const result = await this.prisma.invoice.updateMany({
      where: { status: InvoiceStatus.SENT, dueDate: { lt: new Date() }, accountId },
      data: { status: InvoiceStatus.OVERDUE },
    });
    if (result.count > 0) {
      this.logger.log(`Flagged ${result.count} invoice(s) as OVERDUE`);
    }
    return result.count;
  }

  /**
   * One email per property (or whole account) listing every overdue invoice
   * that's cleared the grace period, sent to that property's contact.
   * Pass accountId to scope this to one customer - used by the "Send
   * payment reminder" button on the account page for an on-demand send
   * outside the normal weekly schedule, same logic either way.
   */
  async sendOverdueDigest(accountId?: string) {
    const gracePeriodDays = Number(this.config.get('REMINDER_GRACE_PERIOD_DAYS', 14));
    const now = Date.now();

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.OVERDUE, accountId },
      include: { account: { include: { contacts: true } }, property: true },
    });

    // Only invoices that have actually cleared the grace period go in a
    // digest - a couple of days late shouldn't show up yet.
    const due = overdueInvoices.filter(
      (invoice) => (now - invoice.dueDate.getTime()) / 86_400_000 >= gracePeriodDays,
    );

    const groups = new Map<string, typeof due>();
    for (const invoice of due) {
      const key = `${invoice.accountId}::${invoice.propertyId ?? 'none'}`;
      const group = groups.get(key);
      if (group) group.push(invoice);
      else groups.set(key, [invoice]);
    }

    let invoicesIncluded = 0;
    let emailsSent = 0;
    const skipped: { account: string; property: string | null; invoiceNumbers: string[] }[] = [];

    for (const group of groups.values()) {
      const [first] = group;
      const invoiceNumbers = group.map((i) => i.invoiceNumber);

      // Same recipient rule the rest of the app uses: a contact scoped to
      // this property, or a whole-account contact, marked to receive
      // reminders (or filling the INVOICING role).
      const recipients = first.account.contacts.filter(
        (c) =>
          (c.propertyId === null || c.propertyId === first.propertyId) &&
          (c.receivesReminders || c.role === ContactRole.INVOICING) &&
          c.email,
      );

      if (recipients.length === 0) {
        this.logger.warn(
          `${invoiceNumbers.length} overdue invoice(s) for "${first.account.name}"${
            first.property ? ` / ${first.property.name}` : ''
          } but no contact is marked to receive reminders - skipping`,
        );
        skipped.push({
          account: first.account.name,
          property: first.property?.name ?? null,
          invoiceNumbers,
        });
        continue;
      }

      const totalCents = group.reduce((sum, i) => sum + i.amountCents, 0);
      const recipientLabel = first.property ? first.property.name : first.account.name;
      const rows = group
        .map((i) => {
          const daysPastDue = Math.floor((now - i.dueDate.getTime()) / 86_400_000);
          return `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${i.invoiceNumber}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(i.amountCents)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${i.dueDate.toDateString()}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${daysPastDue} day${daysPastDue === 1 ? '' : 's'}</td>
        </tr>`;
        })
        .join('');

      const subject = `Payment reminder: ${group.length} overdue invoice${group.length === 1 ? '' : 's'} for ${recipientLabel}`;
      const html = `
        <p>Hi,</p>
        <p>${group.length === 1 ? 'This invoice has' : `These ${group.length} invoices have`} not yet
        been paid:</p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f2937;">Invoice</th>
              <th style="text-align:right;padding:4px 8px;border-bottom:2px solid #1f2937;">Amount</th>
              <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f2937;">Due date</th>
              <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f2937;">Past due</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:12px;"><strong>Total overdue: ${money(totalCents)}</strong></p>
        <p>Please remit payment at your earliest convenience. Reply to this email with any questions.</p>
      `;

      for (const contact of recipients) {
        await this.mail.send({ to: contact.email!, subject, html });
        // One log row per invoice per recipient - keeps each invoice's own
        // "reminder history" (shown on the invoice detail page) accurate,
        // even though the email itself covered several invoices at once.
        for (const invoice of group) {
          await this.prisma.reminderLog.create({
            data: { invoiceId: invoice.id, toEmail: contact.email!, subject },
          });
        }
        emailsSent++;
      }
      invoicesIncluded += group.length;
    }

    if (emailsSent > 0) {
      this.logger.log(`Sent ${emailsSent} overdue-digest email(s) covering ${invoicesIncluded} invoice(s)`);
    }
    return { invoicesIncluded, emailsSent, skipped };
  }
}
