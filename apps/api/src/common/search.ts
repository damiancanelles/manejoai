// Words a person types in a search box for readability but never means to
// match on - stripping them keeps "unit 413 in Harborview" from failing
// just because no field literally contains "in".
const STOPWORDS = new Set(['in', 'at', 'the', 'for', 'of', 'to', 'on', 'a', 'an', 'and', 'or', 'with']);

/**
 * Splits a free-text search box value into terms for an AND-of-ORs match:
 * every term has to appear in *some* searchable field, but they don't all
 * have to be in the same one. So "Harborview 413" matches a row whose
 * customer is "Harborview Management" and whose title has "Unit 413" - a
 * plain `contains` on the whole string wouldn't, since no single field
 * holds both words. Used by every list endpoint's `search` param (see the
 * `findAll` methods in accounts/jobs/invoices/quotes services) and, through
 * those, by the in-app assistant's search tools.
 *
 * Returns [] for a blank/whitespace/stopword-only search so the caller can
 * skip the filter entirely rather than match nothing.
 */
export function searchTerms(raw: string): string[] {
  const all = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const meaningful = all.filter((t) => !STOPWORDS.has(t));
  // If the whole query was stopwords ("the"), fall back to matching on them
  // rather than returning everything.
  return (meaningful.length ? meaningful : all).slice(0, 6); // cap as a sanity limit
}
