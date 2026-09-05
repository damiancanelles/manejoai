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

  private async nextInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    return `INV-${1001 + count}`;
  }

  /** Recomputes and persists amountCents from this quote's current items. */
  private async recomputeAmount(quoteId: string) {
    const items = await this.prisma.quoteItem.findMany({ where: { quoteId } });
    const amountCents = items.reduce((sum, item) => sum + lineTotal(item), 0);
    await this.prisma.quote.update({ where: { id: quoteId }, data: { amountCents } });
    return amountCents;
  }

  private async assertEditable(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status === QuoteStatus.APPROVED) {
      throw new BadRequestException("Can't change items on an approved quote.");
    }
    return quote;
  }

  async create(dto: CreateQuoteDto, createdById: string) {
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

  findAll(filters: { status?: QuoteStatus; accountId?: string; search?: string }) {
    return this.prisma.quote.findMany({
      where: {
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

  async findOne(id: string) {
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
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    await this.assertEditable(id);
    return this.prisma.quote.update({ where: { id }, data: dto });
  }

  async addItem(quoteId: string, dto: QuoteItemInputDto) {
    await this.assertEditable(quoteId);
    await this.prisma.quoteItem.create({ data: { quoteId, ...dto } });
    await this.recomputeAmount(quoteId);
    return this.findOne(quoteId);
  }

  async updateItem(quoteId: string, itemId: string, dto: Partial<QuoteItemInputDto>) {
    await this.assertEditable(quoteId);
    const item = await this.prisma.quoteItem.findUnique({ where: { id: itemId } });
    if (!item || item.quoteId !== quoteId) throw new NotFoundException('Quote item not found');
    await this.prisma.quoteItem.update({ where: { id: itemId }, data: dto });
    await this.recomputeAmount(quoteId);
    return this.findOne(quoteId);
  }

  async removeItem(quoteId: string, itemId: string) {
    await this.assertEditable(quoteId);
    const item = await this.prisma.quoteItem.findUnique({ where: { id: itemId } });
    if (!item || item.quoteId !== quoteId) throw new NotFoundException('Quote item not found');
    const remaining = await this.prisma.quoteItem.count({ where: { quoteId } });
    if (remaining <= 1) {
      throw new BadRequestException('A quote needs at least one item.');
    }
    await this.prisma.quoteItem.delete({ where: { id: itemId } });
    await this.recomputeAmount(quoteId);
    return this.findOne(quoteId);
  }

  /**
   * Approves the quote and converts it into a real DRAFT invoice carrying the
   * same account/property/job and a copy of its items. Due date defaults to
   * 30 days from approval, same as a normally-created invoice.
   */
  async approve(id: string, approvedById: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status === QuoteStatus.APPROVED) {
      throw new BadRequestException('This quote is already approved.');
    }
    if (quote.items.length === 0) {
      throw new BadRequestException("Can't approve a quote with no items.");
    }

    const invoiceNumber = await this.nextInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          accountId: quote.accountId,
          propertyId: quote.propertyId,
          jobId: quote.jobId,
          amountCents: quote.amountCents,
          dueDate,
          notes: quote.notes,
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

    return this.findOne(id);
  }

  async remove(id: string) {
    const quote = await this.findOne(id);
    if (quote.status === QuoteStatus.APPROVED) {
      throw new BadRequestException("Can't delete an approved quote - it's linked to a real invoice.");
    }
    await this.prisma.quote.delete({ where: { id } });
    return { ok: true };
  }
}
