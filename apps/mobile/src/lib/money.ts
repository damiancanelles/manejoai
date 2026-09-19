/** Mirrors apps/web/src/lib/invoiceStats.ts's money() - amounts from the API are always in cents. */
export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
