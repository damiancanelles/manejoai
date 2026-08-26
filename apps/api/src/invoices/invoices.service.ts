import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async nextInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    // Starts at INV-1001 so numbers look reasonable next to whatever's already
    // in the imported Excel history.
    return `INV-${1001 + count}`;
  }

  async create(dto: CreateInvoiceDto, createdById: string) {
    const invoiceNumber = await this.nextInvoiceNumber();
    return this.prisma.invoice.create({
      data: {
        accountId: dto.accountId,
        propertyId: dto.propertyId,
        jobId: dto.jobId,
        amountCents: dto.amountCents,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        invoiceNumber,
        status: InvoiceStatus.DRAFT,
        createdById,
      },
    });
  }

  findAll(filters: { status?: InvoiceStatus; accountId?: string }) {
    return this.prisma.invoice.findMany({
      where: {
        status: filters.status,
        accountId: filters.accountId,
      },
      orderBy: { issueDate: 'desc' },
      include: { account: true, property: true },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { account: true, property: true, job: true, reminders: { orderBy: { sentAt: 'desc' } } },
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
}
