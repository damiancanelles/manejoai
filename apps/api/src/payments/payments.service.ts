import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto } from './dto';

const UNPAYABLE_STATUSES: InvoiceStatus[] = [InvoiceStatus.PAID, InvoiceStatus.CANCELED];

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Records one payment covering one or more invoices - the durable "this
   * money came in on this date, for these invoices" record, separate from
   * (but the reason behind) each invoice flipping to PAID. Used both by the
   * batch "record payment" flow and by the single-invoice "mark as paid"
   * button, so every paid invoice has exactly one consistent trail.
   */
  async record(dto: RecordPaymentDto, createdById: string) {
    const invoices = await this.prisma.invoice.findMany({ where: { id: { in: dto.invoiceIds } } });

    const foundIds = new Set(invoices.map((i) => i.id));
    const missing = dto.invoiceIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Invoice(s) not found: ${missing.join(', ')}`);
    }

    const accountId = invoices[0].accountId;
    const otherAccount = invoices.filter((i) => i.accountId !== accountId);
    if (otherAccount.length > 0) {
      throw new BadRequestException(
        `All invoices in one payment must belong to the same customer. These don't match the rest: ${otherAccount
          .map((i) => i.invoiceNumber)
          .join(', ')}`,
      );
    }

    const alreadySettled = invoices.filter((i) => UNPAYABLE_STATUSES.includes(i.status));
    if (alreadySettled.length > 0) {
      throw new BadRequestException(
        `Already ${alreadySettled[0].status === InvoiceStatus.PAID ? 'paid' : 'canceled'}: ${alreadySettled
          .map((i) => i.invoiceNumber)
          .join(', ')}`,
      );
    }

    const paidAt = new Date(dto.paidAt);
    const amountCents = invoices.reduce((sum, i) => sum + i.amountCents, 0);

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: { accountId, paidAt, amountCents, notes: dto.notes, createdById },
      });
      await tx.invoice.updateMany({
        where: { id: { in: dto.invoiceIds } },
        data: { status: InvoiceStatus.PAID, paidAt, paymentId: created.id },
      });
      return created;
    });

    return this.findOne(payment.id);
  }

  findAll(filters: { accountId?: string }) {
    return this.prisma.payment.findMany({
      where: { accountId: filters.accountId },
      orderBy: { paidAt: 'desc' },
      include: { account: true, invoices: true },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { account: true, invoices: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  /**
   * Undoes a payment: each covered invoice goes back to SENT, or OVERDUE if
   * its due date has already passed, and loses its paidAt/paymentId. The
   * Payment record itself is deleted - there's nothing worth keeping once
   * it's void.
   */
  async remove(id: string) {
    const payment = await this.findOne(id);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const invoice of payment.invoices) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: invoice.dueDate < now ? InvoiceStatus.OVERDUE : InvoiceStatus.SENT,
            paidAt: null,
            paymentId: null,
          },
        });
      }
      await tx.payment.delete({ where: { id } });
    });

    return { ok: true };
  }
}
