/**
 * Turns a business name into the local part of its manejoai.cloud sending
 * address (e.g. "N2Sky" -> "n2sky") - lowercase, alphanumeric only, no
 * separators. Matches the backfill formula used in the
 * 20260909000000_business_email_identity migration so old and new
 * businesses get the same shape.
 */
export function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return base || 'business';
}
