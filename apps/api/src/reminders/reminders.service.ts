import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ContactRole, InvoiceStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { COMPANY } from '../config/company';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function daysBetween(now: number, date: Date) {
  return Math.floor((now - date.getTime()) / 86_400_000);
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
    if (!this.remindersEnabled()) return;
    await this.flagOverdueInvoices();
  }

  // The actual reminder emails go out once a week. Change the cron
  // expression to move the day/time, or trigger manually via
  // POST /api/reminders/run while testing.
  @Cron('0 8 * * 1') // every Monday at 8am server time
  async runWeeklyDigest() {
    if (!this.remindersEnabled()) return;
    await this.sendOverdueDigest();
  }

  // Kill switch for the automated cron jobs above - defaults to OFF so a
  // fresh/still-being-populated database (backdated invoices, test data,
  // etc.) never triggers a surprise reminder email to a real customer.
  // Set REMINDERS_ENABLED=true once real data is in and you're ready to go
  // live with this. The manual "Send payment reminder" button and
  // POST /api/reminders/run are NOT affected - those are always explicit.
  private remindersEnabled(): boolean {
    return this.config.get<string>('REMINDERS_ENABLED') === 'true';
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

      // Invoices in this group can carry different due dates (a property
      // with several jobs invoiced over time) - break the list into one
      // sub-table per due date, oldest first, each with its own subtotal and
      // "days overdue" instead of one flat undifferentiated table.
      const byDueDate = new Map<string, typeof group>();
      for (const inv of group) {
        const key = inv.dueDate.toISOString().slice(0, 10);
        const bucket = byDueDate.get(key);
        if (bucket) bucket.push(inv);
        else byDueDate.set(key, [inv]);
      }
      const sortedDueDateKeys = [...byDueDate.keys()].sort();
      const oldestDaysPastDue = daysBetween(now, group.reduce((a, b) => (a.dueDate < b.dueDate ? a : b)).dueDate);

      const sections = sortedDueDateKeys
        .map((key) => {
          const invs = byDueDate.get(key)!;
          const daysPastDue = daysBetween(now, invs[0].dueDate);
          const subtotalCents = invs.reduce((sum, i) => sum + i.amountCents, 0);
          const rows = invs
            .map(
              (i) => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${i.invoiceNumber}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(i.amountCents)}</td>
        </tr>`,
            )
            .join('');
          return `
        <p style="margin:16px 0 4px;font-family:sans-serif;font-size:14px;font-weight:600;">
          Due ${invs[0].dueDate.toDateString()} — ${daysPastDue} day${daysPastDue === 1 ? '' : 's'} overdue
        </p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%;max-width:420px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f2937;">Invoice</th>
              <th style="text-align:right;padding:4px 8px;border-bottom:2px solid #1f2937;">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td style="padding:4px 8px;font-weight:600;">Subtotal</td>
              <td style="padding:4px 8px;text-align:right;font-weight:600;">${money(subtotalCents)}</td>
            </tr>
          </tfoot>
        </table>`;
        })
        .join('');

      const propertyLine = first.property
        ? `<strong>${first.account.name}</strong> — ${first.property.name}`
        : `<strong>${first.account.name}</strong>`;

      const subject = `Payment reminder: ${group.length} overdue invoice${group.length === 1 ? '' : 's'} for ${recipientLabel}`;

      for (const contact of recipients) {
        const html = `
        <p style="font-family:sans-serif;font-size:14px;">Hi ${contact.name},</p>
        <p style="font-family:sans-serif;font-size:14px;">
          This is a reminder that the following invoice${group.length === 1 ? ' is' : 's are'} still outstanding
          for ${propertyLine}:
        </p>
        ${sections}
        <p style="margin-top:16px;font-family:sans-serif;font-size:15px;">
          <strong>Total overdue: ${money(totalCents)}</strong>
          ${sortedDueDateKeys.length > 1 ? `<br/><span style="font-size:13px;color:#6b7280;">(oldest invoice ${oldestDaysPastDue} days past due)</span>` : ''}
        </p>
        <p style="font-family:sans-serif;font-size:14px;">
          Please remit payment at your earliest convenience - mail a check to ${COMPANY.name}, ${COMPANY.addressLine1},
          ${COMPANY.addressLine2}, or reply to this email with any questions.
        </p>
        <p style="font-family:sans-serif;font-size:14px;">
          Thank you for your business.<br/>${COMPANY.name}
        </p>
      `;
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
