// Pure aggregation helpers shared by the Dashboard (business-wide) and the
// customer page (scoped to one account). "Gross income" here means the
// total invoiced amount - every invoice counts regardless of status (DRAFT,
// SENT, OVERDUE, PAID) except CANCELED, which never became real business,
// bucketed by issueDate (when the invoice was created), not when/whether it
// was actually paid. That's a billed-amount view, not a cash-collected view
// - see sumByStatus below for the PAID-only figures (the Dashboard's
// "Paid (all time)" tile, etc).

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

/** Trailing N calendar months (oldest first), every non-canceled invoice's amount bucketed by issueDate. */
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
    if (inv.status === 'CANCELED') continue;
    const issueDate = new Date(inv.issueDate);
    const key = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.cents += inv.amountCents;
  }
  return buckets;
}

export interface RankedRow {
  name: string;
  cents: number;
}

/** Every non-canceled invoice's amount grouped by customer name, highest first. */
export function incomeByCustomer(invoices: StatsInvoice[]): RankedRow[] {
  const totals = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status === 'CANCELED' || !inv.account) continue;
    totals.set(inv.account.name, (totals.get(inv.account.name) || 0) + inv.amountCents);
  }
  return [...totals.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}

/**
 * Sums `invoices` grouped by property name, highest first. `properties`
 * maps propertyId -> name (the caller already has this loaded, e.g. from
 * account.properties) - invoices with no propertyId fold into "No property".
 */
function groupByProperty(invoices: StatsInvoice[], properties: Map<string, string>): RankedRow[] {
  const totals = new Map<string, number>();
  for (const inv of invoices) {
    const name = (inv.propertyId && properties.get(inv.propertyId)) || 'No property';
    totals.set(name, (totals.get(name) || 0) + inv.amountCents);
  }
  return [...totals.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}

/** Every non-canceled invoice's amount grouped by property name, highest first. */
export function incomeByProperty(invoices: StatsInvoice[], properties: Map<string, string>): RankedRow[] {
  return groupByProperty(
    invoices.filter((i) => i.status !== 'CANCELED'),
    properties,
  );
}

/** Only PAID invoices - actual money collected - grouped by property, highest first. */
export function paidByProperty(invoices: StatsInvoice[], properties: Map<string, string>): RankedRow[] {
  return groupByProperty(
    invoices.filter((i) => i.status === 'PAID'),
    properties,
  );
}

/** Only OVERDUE invoices grouped by property, highest first. */
export function overdueByProperty(invoices: StatsInvoice[], properties: Map<string, string>): RankedRow[] {
  return groupByProperty(
    invoices.filter((i) => i.status === 'OVERDUE'),
    properties,
  );
}

export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
