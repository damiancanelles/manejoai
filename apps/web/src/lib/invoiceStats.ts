// Pure aggregation helpers shared by the Dashboard (business-wide) and the
// customer page (scoped to one account). "Gross income" means money actually
// collected - the sum of PAID invoices - not everything ever billed.

export interface StatsInvoice {
  amountCents: number;
  status: string;
  paidAt?: string | null;
  issueDate: string;
  accountId?: string;
  propertyId?: string | null;
  account?: { name: string };
}

export function sumByStatus(invoices: StatsInvoice[], status: string): number {
  return invoices.filter((i) => i.status === status).reduce((sum, i) => sum + i.amountCents, 0);
}

export interface MonthBucket {
  key: string; // "2026-03"
  label: string; // "Mar 2026"
  cents: number;
}

/** Trailing N calendar months (oldest first), gross income (PAID only) bucketed by paidAt. */
export function monthlyIncome(invoices: StatsInvoice[], monthsBack = 12): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    buckets.push({ key, label, cents: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const inv of invoices) {
    if (inv.status !== 'PAID') continue;
    const paidDate = inv.paidAt ? new Date(inv.paidAt) : new Date(inv.issueDate);
    const key = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.cents += inv.amountCents;
  }
  return buckets;
}

export interface RankedRow {
  name: string;
  cents: number;
}

/** Gross income (PAID only) grouped by customer name, highest first. */
export function incomeByCustomer(invoices: StatsInvoice[]): RankedRow[] {
  const totals = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status !== 'PAID' || !inv.account) continue;
    totals.set(inv.account.name, (totals.get(inv.account.name) || 0) + inv.amountCents);
  }
  return [...totals.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}

/**
 * Gross income (PAID only) grouped by property name, highest first.
 * `properties` maps propertyId -> name (the caller already has this loaded,
 * e.g. from account.properties) - invoices with no propertyId fold into
 * "No property".
 */
export function incomeByProperty(invoices: StatsInvoice[], properties: Map<string, string>): RankedRow[] {
  const totals = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status !== 'PAID') continue;
    const name = (inv.propertyId && properties.get(inv.propertyId)) || 'No property';
    totals.set(name, (totals.get(name) || 0) + inv.amountCents);
  }
  return [...totals.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}

export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
