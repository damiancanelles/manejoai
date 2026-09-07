import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto, QuoteItemInputDto, UpdateQuoteDto, UpdateQuoteItemDto } from './dto';

function lineTotal(item: { quantity: number; unitPriceCents: number }) {
  return item.quantity * item.unitPriceCents;
}

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  private async nextQuoteNumber(): Promise<string> {
    const count = await this.prisma.quote.count();
    return `QUO-${1001 + count}`;
  }

  // Kept in sync with InvoicesService.nextInvoiceNumber - see the comment
  // there for why this isn't just a row count, and why it's per business.
  private async nextInvoiceNumber(businessId: string): Promise<string> {
    const result = await this.prisma.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST("invoiceNumber" AS INTEGER)) as max
      FROM "Invoice"
      WHERE "invoiceNumber" ~ '^1[0-9]{4}$' AND "businessId" = ${businessId}
    `;
    const max = result[0]?.max ?? 10000;
    return String(max + 1);
  }

  /** Recomputes and persists amountCents from this quote's current items. */
  private async recomputeAmount(quoteId: string) {
    const items = await this.prisma.quoteItem.findMany({ where: { quoteId } });
    const amountCents = items.reduce((sum, item) => sum + lineTotal(item), 0);
    await this.prisma.quote.update({ where: { id: quoteId }, data: { amountCents } });
    return amountCents;
  }

  /** Confirms accountId is one of this business's accounts before letting anything reference it. */
  private async assertOwnsAccount(accountId: string, businessId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.businessId !== businessId) throw new NotFoundException('Account not found');
  }

  private async assertEditable(quoteId: string, businessId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId }, include: { account: true } });
    if (!quote || quote.account.businessId !== businessId) throw new NotFoundException('Quote not found');
    if (quote.status === QuoteStatus.APPROVED) {
      throw new BadRequestException("Can't change items on an approved quote.");
    }
    return quote;
  }

  async create(dto: CreateQuoteDto, createdById: string, businessId: string) {
    await this.assertOwnsAccount(dto.accountId, businessId);
    const quoteNumber = await this.nextQuoteNumber();
    const amountCents = dto.items.reduce((sum, item) => sum + lineTotal(item), 0);
    return this.prisma.quote.create({
      data: {
        accountId: dto.accountId,
        propertyId: dto.propertyId,
        jobId: dto.jobId,
        amountCents,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        notes: dto.notes,
        quoteNumber,
        status: QuoteStatus.PENDING,
        createdById,
        items: { create: dto.items.map((item) => ({ ...item })) },
      },
      include: { items: true },
    });
  }

  findAll(filters: { status?: QuoteStatus; accountId?: string; search?: string }, businessId: string) {
    return this.prisma.quote.findMany({
      where: {
        account: { businessId },
        status: filters.status,
        accountId: filters.accountId,
        ...(filters.search
          ? {
              OR: [
                { quoteNumber: { contains: filters.search, mode: 'insensitive' as const } },
                { notes: { contains: filters.search, mode: 'insensitive' as const } },
                { account: { name: { contains: filters.search, mode: 'insensitive' as const } } },
                { property: { name: { contains: filters.search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      orderBy: { issueDate: 'desc' },
      include: { account: true, property: true },
    });
  }

  async findOne(id: string, businessId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        account: true,
        property: true,
        job: true,
        items: { orderBy: { createdAt: 'asc' } },
        invoice: true,
      },
    });
    if (!quote || quote.account.businessId !== businessId) throw new NotFoundException('Quote not found');
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto, businessId: string) {
    await this.assertEditable(id, businessId);
    return this.prisma.quote.update({ where: { id }, data: dto });
  }

  async addItem(quoteId: string, dto: QuoteItemInputDto, businessId: string) {
    await this.assertEditable(quoteId, businessId);
    await this.prisma.quoteItem.create({ data: { quoteId, ...dto } });
    await this.recomputeAmount(quoteId);
    return this.findOne(quoteId, businessId);
  }

  async updateItem(quoteId: string, itemId: string, dto: Partial<QuoteItemInputDto>, businessId: string) {
    await this.assertEditable(quoteId, businessId);
    const item = await this.prisma.quoteItem.findUnique({ where: { id: itemId } });
    if (!item || item.quoteId !== quoteId) throw new NotFoundException('Quote item not found');
    await this.prisma.quoteItem.update({ where: { id: itemId }, data: dto });
    await this.recomputeAmount(quoteId);
    return this.findOne(quoteId, businessId);
  }

  async removeItem(quoteId: string, itemId: string, businessId: string) {
    await this.assertEditable(quoteId, businessId);
    const item = await this.prisma.quoteItem.findUnique({ where: { id: itemId } });
    if (!item || item.quoteId !== quoteId) throw new NotFoundException('Quote item not found');
    const remaining = await this.prisma.quoteItem.count({ where: { quoteId } });
    if (remaining <= 1) {
      throw new BadRequestException('A quote needs at least one item.');
    }
    await this.prisma.quoteItem.delete({ where: { id: itemId } });
    await this.recomputeAmount(quoteId);
    return this.findOne(quoteId, businessId);
  }

  /**
   * Approves the quote and converts it into a real DRAFT invoice carrying the
   * same account/property/job and a copy of its items. Due date defaults to
   * 30 days from approval, same as a normally-created invoice.
   */
  async approve(id: string, approvedById: string, businessId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true, job: true, property: true, account: true },
    });
    if (!quote || quote.account.businessId !== businessId) throw new NotFoundException('Quote not found');
    if (quote.status === QuoteStatus.APPROVED) {
      throw new BadRequestException('This quote is already approved.');
    }
    if (quote.items.length === 0) {
      throw new BadRequestException("Can't approve a quote with no items.");
    }

    const invoiceNumber = await this.nextInvoiceNumber(businessId);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          accountId: quote.accountId,
          businessId,
          propertyId: quote.propertyId,
          jobId: quote.jobId,
          amountCents: quote.amountCents,
          dueDate,
          // Invoice.title is required; the quote's own notes (freeform,
          // optional) usually already describes the work, but fall back to
          // the linked job/property/account name so this can't fail on a
          // quote that was created without notes.
          title: quote.notes || quote.job?.title || quote.property?.name || quote.account.name,
          invoiceNumber,
          status: InvoiceStatus.DRAFT,
          createdById: approvedById,
          items: {
            create: quote.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
            })),
          },
        },
      });

      await tx.quote.update({
        where: { id },
        data: { status: QuoteStatus.APPROVED, approvedAt: new Date(), invoiceId: invoice.id },
      });
    });

    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string) {
    const quote = await this.findOne(id, businessId);
    if (quote.status === QuoteStatus.APPROVED) {
      throw new BadRequestException("Can't delete an approved quote - it's linked to a real invoice.");
    }
    await this.prisma.quote.delete({ where: { id } });
    return { ok: true };
  }
}
