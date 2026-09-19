// Ported from apps/web/src/lib/invoiceStats.ts - pure aggregation helpers,
// no DOM dependency, works as-is on RN's JS engine. money() lives in
// ./money instead of being redefined here (mobile already had its own
// before this got ported) - everything else is unchanged.
//
// "Gross income" here means the total invoiced amount - every invoice
// counts regardless of status (DRAFT, SENT, OVERDUE, PAID) except
// CANCELED, bucketed by issueDate, not when/whether it was paid. See
// sumByStatus for the PAID-only (cash-collected) figures.

export interface StatsInvoice {
  amountCents: number;
  status: string;
  paidAt?: string | null;
  issueDate: string;
  accountId?: string;
  propertyId?: string | null;
  account?: { name: string };
}

/** Every calendar year that has at least one invoice, newest first. */
export function yearsWithInvoices(invoices: StatsInvoice[]): number[] {
  const years = new Set(invoices.map((i) => new Date(i.issueDate).getFullYear()));
  return [...years].sort((a, b) => b - a);
}

function matchesYear(invoice: StatsInvoice, year: number | null): boolean {
  return year == null || new Date(invoice.issueDate).getFullYear() === year;
}

export function sumByStatus(invoices: StatsInvoice[], status: string, year: number | null = null): number {
  return invoices
    .filter((i) => i.status === status && matchesYear(i, year))
    .reduce((sum, i) => sum + i.amountCents, 0);
}

export interface MonthBucket {
  key: string; // "2026-03"
  label: string; // "Mar" (a specific year) or "Mar '26" (all time, spans years)
  cents: number;
}

/**
 * Every non-canceled invoice's amount bucketed by issueDate's month.
 * A specific `year` gives all 12 calendar months of that year, empty months
 * included; `null` (all time) gives every month that actually has data,
 * across however many years, oldest first.
 */
export function monthlyIncome(invoices: StatsInvoice[], year: number | null, locale = 'en-US'): MonthBucket[] {
  const relevant = invoices.filter((i) => i.status !== 'CANCELED');

  if (year != null) {
    const buckets: MonthBucket[] = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 1);
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      buckets.push({ key, label: d.toLocaleDateString(locale, { month: 'short' }), cents: 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const inv of relevant) {
      const d = new Date(inv.issueDate);
      if (d.getFullYear() !== year) continue;
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byKey.get(key)!.cents += inv.amountCents;
    }
    return buckets;
  }

  const byKey = new Map<string, MonthBucket>();
  for (const inv of relevant) {
    const d = new Date(inv.issueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byKey.has(key)) {
      byKey.set(key, { key, label: d.toLocaleDateString(locale, { month: 'short', year: '2-digit' }), cents: 0 });
    }
    byKey.get(key)!.cents += inv.amountCents;
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface RankedRow {
  name: string;
  cents: number;
}

/** Every non-canceled invoice's amount grouped by customer name, highest first. */
export function incomeByCustomer(invoices: StatsInvoice[], year: number | null = null): RankedRow[] {
  const totals = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status === 'CANCELED' || !inv.account || !matchesYear(inv, year)) continue;
    totals.set(inv.account.name, (totals.get(inv.account.name) || 0) + inv.amountCents);
  }
  return [...totals.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}
