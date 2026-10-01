import { NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface StatementInvoiceRow {
  id: string;
  invoiceNumber: string;
  title: string;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  amountCents: number;
  propertyName: string | null;
}
export interface StatementPaymentRow {
  id: string;
  paidAt: Date;
  // The portion of this payment that applies to the statement's scope - for
  // an account-level statement this always equals the payment's own
  // amountCents (a payment can never span accounts, see PaymentsService.record),
  // but for a property-level statement a batch payment can cover invoices
  // from several of that account's properties at once, so only the slice
  // belonging to this one property counts here.
  appliedCents: number;
  invoiceNumbers: string[];
}
export interface Statement {
  scope: 'account' | 'property';
  businessId: string;
  accountId: string;
  accountName: string;
  propertyName: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  invoices: StatementInvoiceRow[];
  payments: StatementPaymentRow[];
  totals: { invoicedCents: number; paidCents: number; balanceCents: number };
}

function dateRangeFilter(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  return {
    gte: dateFrom ? new Date(dateFrom) : undefined,
    lte: dateTo ? new Date(`${dateTo}T23:59:59.999`) : undefined,
  };
}

function totalsFrom(invoices: StatementInvoiceRow[], payments: StatementPaymentRow[]) {
  const invoicedCents = invoices.filter((i) => i.status !== InvoiceStatus.CANCELED).reduce((sum, i) => sum + i.amountCents, 0);
  const paidCents = payments.reduce((sum, p) => sum + p.appliedCents, 0);
  return { invoicedCents, paidCents, balanceCents: invoicedCents - paidCents };
}

/** A customer's own statement - every invoice is already guaranteed to belong
 * to this one account, and (per PaymentsService.record) so is every payment
 * that touches any of them, so no per-row "applied" slicing is needed. */
export async function buildAccountStatement(
  prisma: PrismaService,
  accountId: string,
  businessId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<Statement> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { id: true, name: true, businessId: true } });
  if (!account || account.businessId !== businessId) throw new NotFoundException('Customer not found');

  const invoiceRows = await prisma.invoice.findMany({
    where: { accountId, issueDate: dateRangeFilter(dateFrom, dateTo) },
    select: {
      id: true,
      invoiceNumber: true,
      title: true,
      issueDate: true,
      dueDate: true,
      status: true,
      amountCents: true,
      property: { select: { name: true } },
    },
    orderBy: { issueDate: 'asc' },
  });
  const invoices: StatementInvoiceRow[] = invoiceRows.map((i) => ({ ...i, propertyName: i.property?.name ?? null }));

  const paymentRows = await prisma.payment.findMany({
    where: { accountId, paidAt: dateRangeFilter(dateFrom, dateTo) },
    include: { invoices: { select: { invoiceNumber: true } } },
    orderBy: { paidAt: 'asc' },
  });
  const payments: StatementPaymentRow[] = paymentRows.map((p) => ({
    id: p.id,
    paidAt: p.paidAt,
    appliedCents: p.amountCents,
    invoiceNumbers: p.invoices.map((i) => i.invoiceNumber),
  }));

  return {
    scope: 'account',
    businessId,
    accountId: account.id,
    accountName: account.name,
    propertyName: null,
    periodFrom: dateFrom ?? null,
    periodTo: dateTo ?? null,
    invoices,
    payments,
    totals: totalsFrom(invoices, payments),
  };
}

/** One property's own slice of its account's activity - a batch payment can
 * cover invoices from several properties of the same account at once, so
 * each payment's appliedCents here is only the part that paid off THIS
 * property's invoices, not the payment's full amount. */
export async function buildPropertyStatement(
  prisma: PrismaService,
  propertyId: string,
  businessId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<Statement> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, account: { select: { id: true, name: true, businessId: true } } },
  });
  if (!property || property.account.businessId !== businessId) throw new NotFoundException('Property not found');

  const invoiceRows = await prisma.invoice.findMany({
    where: { propertyId, issueDate: dateRangeFilter(dateFrom, dateTo) },
    select: { id: true, invoiceNumber: true, title: true, issueDate: true, dueDate: true, status: true, amountCents: true },
    orderBy: { issueDate: 'asc' },
  });
  const invoices: StatementInvoiceRow[] = invoiceRows.map((i) => ({ ...i, propertyName: property.name }));

  const paymentRows = await prisma.payment.findMany({
    where: { accountId: property.account.id, paidAt: dateRangeFilter(dateFrom, dateTo), invoices: { some: { propertyId } } },
    include: { invoices: { select: { invoiceNumber: true, amountCents: true, propertyId: true } } },
    orderBy: { paidAt: 'asc' },
  });
  const payments: StatementPaymentRow[] = paymentRows.map((p) => {
    const ownInvoices = p.invoices.filter((i) => i.propertyId === propertyId);
    return {
      id: p.id,
      paidAt: p.paidAt,
      appliedCents: ownInvoices.reduce((sum, i) => sum + i.amountCents, 0),
      invoiceNumbers: ownInvoices.map((i) => i.invoiceNumber),
    };
  });

  return {
    scope: 'property',
    businessId,
    accountId: property.account.id,
    accountName: property.account.name,
    propertyName: property.name,
    periodFrom: dateFrom ?? null,
    periodTo: dateTo ?? null,
    invoices,
    payments,
    totals: totalsFrom(invoices, payments),
  };
}
