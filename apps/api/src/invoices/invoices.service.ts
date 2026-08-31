import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContactRole, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { generateInvoicePdf } from './invoice-pdf';
import { COMPANY } from '../config/company';
import { CreateInvoiceDto, InvoiceItemInputDto, UpdateInvoiceDto } from './dto';

// Once an invoice is settled, its items (and therefore its amount) are locked.
const LOCKED_STATUSES: InvoiceStatus[] = [InvoiceStatus.PAID, InvoiceStatus.CANCELED];

function lineTotal(item: { quantity: number; unitPriceCents: number }) {
  return item.quantity * item.unitPriceCents;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private async nextInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    // Starts at INV-1001 so numbers look reasonable next to whatever's already
    // in the imported Excel history.
    return `INV-${1001 + count}`;
  }

  /** Recomputes and persists amountCents from this invoice's current items. */
  private async recomputeAmount(invoiceId: string) {
    const items = await this.prisma.invoiceItem.findMany({ where: { invoiceId } });
    const amountCents = items.reduce((sum, item) => sum + lineTotal(item), 0);
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { amountCents } });
    return amountCents;
  }

  private async assertEditable(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (LOCKED_STATUSES.includes(invoice.status)) {
      throw new BadRequestException(`Can't change items on a ${invoice.status.toLowerCase()} invoice.`);
    }
    return invoice;
  }

  async create(dto: CreateInvoiceDto, createdById: string) {
    const invoiceNumber = await this.nextInvoiceNumber();
    const amountCents = dto.items.reduce((sum, item) => sum + lineTotal(item), 0);
    return this.prisma.invoice.create({
      data: {
        accountId: dto.accountId,
        propertyId: dto.propertyId,
        jobId: dto.jobId,
        amountCents,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        invoiceNumber,
        status: InvoiceStatus.DRAFT,
        createdById,
        items: { create: dto.items.map((item) => ({ ...item })) },
      },
      include: { items: true },
    });
  }

  findAll(filters: {
    status?: InvoiceStatus;
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    // Include items + job (report exports need these to render a PDF/CSV
    // without an extra round trip per invoice) - skipped by default since
    // the plain list views (Invoices page, Dashboard) don't need them.
    full?: boolean;
  }) {
    return this.prisma.invoice.findMany({
      where: {
        status: filters.status,
        accountId: filters.accountId,
        issueDate:
          filters.dateFrom || filters.dateTo
            ? {
                gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                // end-of-day so a "to" date includes invoices issued that same day
                lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
              }
            : undefined,
      },
      orderBy: { issueDate: 'desc' },
      include: filters.full
        ? { account: true, property: true, job: true, items: true }
        : { account: true, property: true },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        account: true,
        property: true,
        job: true,
        items: { orderBy: { createdAt: 'asc' } },
        reminders: { orderBy: { sentAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    await this.findOne(id);
    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async addItem(invoiceId: string, dto: InvoiceItemInputDto) {
    await this.assertEditable(invoiceId);
    await this.prisma.invoiceItem.create({ data: { invoiceId, ...dto } });
    await this.recomputeAmount(invoiceId);
    return this.findOne(invoiceId);
  }

  async updateItem(invoiceId: string, itemId: string, dto: Partial<InvoiceItemInputDto>) {
    await this.assertEditable(invoiceId);
    const item = await this.prisma.invoiceItem.findUnique({ where: { id: itemId } });
    if (!item || item.invoiceId !== invoiceId) throw new NotFoundException('Invoice item not found');
    await this.prisma.invoiceItem.update({ where: { id: itemId }, data: dto });
    await this.recomputeAmount(invoiceId);
    return this.findOne(invoiceId);
  }

  async removeItem(invoiceId: string, itemId: string) {
    await this.assertEditable(invoiceId);
    const item = await this.prisma.invoiceItem.findUnique({ where: { id: itemId } });
    if (!item || item.invoiceId !== invoiceId) throw new NotFoundException('Invoice item not found');
    const remaining = await this.prisma.invoiceItem.count({ where: { invoiceId } });
    if (remaining <= 1) {
      throw new BadRequestException('An invoice needs at least one item.');
    }
    await this.prisma.invoiceItem.delete({ where: { id: itemId } });
    await this.recomputeAmount(invoiceId);
    return this.findOne(invoiceId);
  }

  async markSent(id: string) {
    await this.findOne(id);
    return this.prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.SENT } });
  }

  async markPaid(id: string) {
    await this.findOne(id);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID, paidAt: new Date() },
    });
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELED, canceledAt: new Date() },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.invoice.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Emails every DRAFT invoice to its customer and marks it SENT. Invoices
   * are grouped by (account, property) - a multifamily account can have a
   * different invoicing contact per building (see the Contact.propertyId
   * relation), so each group goes to its own recipient(s) as one email with
   * each of that group's draft invoices attached as its own separate PDF.
   */
  async sendAllDrafts() {
    const drafts = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.DRAFT },
      include: { account: { include: { contacts: true } }, property: true, job: true, items: true },
      orderBy: [{ accountId: 'asc' }, { propertyId: 'asc' }],
    });

    const groups = new Map<string, typeof drafts>();
    for (const invoice of drafts) {
      const key = `${invoice.accountId}::${invoice.propertyId ?? 'none'}`;
      const group = groups.get(key);
      if (group) group.push(invoice);
      else groups.set(key, [invoice]);
    }

    let sentCount = 0;
    let emailCount = 0;
    const skipped: { account: string; property: string | null; invoiceNumbers: string[]; reason: string }[] = [];

    for (const group of groups.values()) {
      const [first] = group;
      const invoiceNumbers = group.map((i) => i.invoiceNumber);

      // Same recipient rule as payment reminders: a contact scoped to this
      // property, or a whole-account contact, marked to receive invoices
      // (or filling the INVOICING role, same fallback reminders use).
      const recipients = first.account.contacts.filter(
        (c) =>
          (c.propertyId === null || c.propertyId === first.propertyId) &&
          (c.receivesInvoices || c.role === ContactRole.INVOICING) &&
          c.email,
      );

      if (recipients.length === 0) {
        skipped.push({
          account: first.account.name,
          property: first.property?.name ?? null,
          invoiceNumbers,
          reason: 'No contact marked to receive invoices for this customer/property',
        });
        continue;
      }

      // One self-contained PDF per invoice, attached separately - not merged
      // into a single multi-invoice file, since a customer may forward or
      // file each invoice individually.
      const attachments = group.map((invoice) => ({
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: generateInvoicePdf({
          invoiceNumber: invoice.invoiceNumber,
          amountCents: invoice.amountCents,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          account: invoice.account,
          property: invoice.property,
          job: invoice.job,
          items: invoice.items,
        }),
        contentType: 'application/pdf',
      }));

      const totalCents = group.reduce((sum, i) => sum + i.amountCents, 0);
      const total = `$${(totalCents / 100).toFixed(2)}`;
      const subject =
        group.length === 1
          ? `Invoice ${invoiceNumbers[0]} from ${COMPANY.name}`
          : `${group.length} invoices from ${COMPANY.name}`;
      const html = `
        <p>Hi,</p>
        <p>Please find attached ${group.length === 1 ? 'invoice' : `${group.length} invoices`}
        (${invoiceNumbers.join(', ')}) totaling <strong>${total}</strong>.</p>
        <p>Reply to this email with any questions.</p>
      `;

      for (const contact of recipients) {
        await this.mail.send({ to: contact.email!, subject, html, attachments });
        emailCount++;
      }

      await this.prisma.invoice.updateMany({
        where: { id: { in: group.map((i) => i.id) } },
        data: { status: InvoiceStatus.SENT },
      });
      sentCount += group.length;
    }

    return { sentCount, emailCount, skipped };
  }

  /**
   * Emails whatever invoices match the given filters (any status/date range -
   * the same filters the Reports page uses) to each customer, grouped the
   * same way as sendAllDrafts. Unlike sendAllDrafts, this never changes
   * invoice status - it's a statement/report, not a first-time send, so a
   * PAID or already-SENT invoice can be re-shared without side effects.
   * Each email's body summarizes what's attached (count, total, and total
   * overdue) and every invoice is attached as its own separate PDF.
   */
  async sendInvoicesReport(filters: {
    status?: InvoiceStatus;
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: filters.status,
        accountId: filters.accountId,
        issueDate:
          filters.dateFrom || filters.dateTo
            ? {
                gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
              }
            : undefined,
      },
      include: { account: { include: { contacts: true } }, property: true, job: true, items: true },
      orderBy: [{ accountId: 'asc' }, { propertyId: 'asc' }, { issueDate: 'desc' }],
    });

    const groups = new Map<string, typeof invoices>();
    for (const invoice of invoices) {
      const key = `${invoice.accountId}::${invoice.propertyId ?? 'none'}`;
      const group = groups.get(key);
      if (group) group.push(invoice);
      else groups.set(key, [invoice]);
    }

    let emailCount = 0;
    let invoiceCount = 0;
    const skipped: { account: string; property: string | null; invoiceNumbers: string[]; reason: string }[] = [];

    for (const group of groups.values()) {
      const [first] = group;
      const invoiceNumbers = group.map((i) => i.invoiceNumber);

      const recipients = first.account.contacts.filter(
        (c) =>
          (c.propertyId === null || c.propertyId === first.propertyId) &&
          (c.receivesInvoices || c.role === ContactRole.INVOICING) &&
          c.email,
      );

      if (recipients.length === 0) {
        skipped.push({
          account: first.account.name,
          property: first.property?.name ?? null,
          invoiceNumbers,
          reason: 'No contact marked to receive invoices for this customer/property',
        });
        continue;
      }

      const totalCents = group.reduce((sum, i) => sum + i.amountCents, 0);
      const overdue = group.filter((i) => i.status === InvoiceStatus.OVERDUE);
      const overdueCents = overdue.reduce((sum, i) => sum + i.amountCents, 0);

      const rows = group
        .map(
          (i) => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${i.invoiceNumber}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${i.status}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(i.amountCents)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${i.dueDate.toDateString()}</td>
        </tr>`,
        )
        .join('');

      const recipientLabel = first.property ? first.property.name : first.account.name;
      const html = `
        <p>Hi,</p>
        <p>Here's a summary of ${group.length} invoice${group.length === 1 ? '' : 's'} on file for ${recipientLabel}:</p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f2937;">Invoice</th>
              <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f2937;">Status</th>
              <th style="text-align:right;padding:4px 8px;border-bottom:2px solid #1f2937;">Amount</th>
              <th style="text-align:left;padding:4px 8px;border-bottom:2px solid #1f2937;">Due date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:12px;"><strong>Total: ${money(totalCents)}</strong></p>
        ${
          overdue.length > 0
            ? `<p style="color:#b91c1c;"><strong>Overdue: ${money(overdueCents)} across ${overdue.length} invoice${overdue.length === 1 ? '' : 's'}</strong></p>`
            : ''
        }
        <p>Each invoice is attached as its own PDF. Reply to this email with any questions.</p>
      `;
      const subject = `Invoice summary${overdue.length > 0 ? ' - payment overdue' : ''} from ${COMPANY.name}`;

      const attachments = group.map((invoice) => ({
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: generateInvoicePdf({
          invoiceNumber: invoice.invoiceNumber,
          amountCents: invoice.amountCents,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          account: invoice.account,
          property: invoice.property,
          job: invoice.job,
          items: invoice.items,
        }),
        contentType: 'application/pdf',
      }));

      for (const contact of recipients) {
        await this.mail.send({ to: contact.email!, subject, html, attachments });
        emailCount++;
      }
      invoiceCount += group.length;
    }

    return { emailCount, invoiceCount, skipped };
  }
}
