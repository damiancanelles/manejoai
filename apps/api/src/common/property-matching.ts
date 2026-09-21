import { PrismaService } from '../prisma/prisma.service';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents (after NFKD decomposition)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Character-bigram counts, padded so short strings still produce some. */
function bigrams(s: string): Map<string, number> {
  const counts = new Map<string, number>();
  const padded = ` ${s} `;
  for (let i = 0; i < padded.length - 1; i++) {
    const bg = padded.slice(i, i + 2);
    counts.set(bg, (counts.get(bg) ?? 0) + 1);
  }
  return counts;
}

/** Sørensen-Dice coefficient over character bigrams - 1 = identical, 0 = nothing in common. */
function diceCoefficient(a: string, b: string): number {
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  let intersection = 0;
  for (const [bg, countA] of bgA) {
    const countB = bgB.get(bg);
    if (countB) intersection += Math.min(countA, countB);
  }
  const totalA = [...bgA.values()].reduce((sum, c) => sum + c, 0);
  const totalB = [...bgB.values()].reduce((sum, c) => sum + c, 0);
  if (totalA === 0 || totalB === 0) return 0;
  return (2 * intersection) / (totalA + totalB);
}

/**
 * Match freeform property text - from a Telegram message or a crew member's
 * typed report, either way whatever Claude's ReportParsingService extracted
 * as `propertyText` - against this business's real Property names. Tolerant
 * of the kind of thing people actually type: typos ("Vinning Montain" for
 * "Vinings Mountain") and a unit/apartment number tacked on that
 * Property.name doesn't have ("Vinings Mountain - Unit 533"). Exact match
 * wins outright; otherwise falls back to bigram similarity and only returns
 * a match if it's both confident and clearly ahead of the next-closest
 * property - ambiguous or weak matches are left null for staff to resolve
 * manually. Shared by TelegramService and IncomingReportsService (crew
 * report submission) - both funnel into the same IncomingReport model and
 * review screen, so they should match the same way.
 */
export async function matchPropertyByText(
  prisma: PrismaService,
  businessId: string,
  propertyText: string,
): Promise<string | null> {
  const properties = await prisma.property.findMany({
    where: { account: { businessId } },
    select: { id: true, name: true },
  });
  if (properties.length === 0) return null;

  const stripped = propertyText.replace(/[-,]?\s*(unit|apt|apartment|bldg|building|#)\s*\S+\s*$/i, '');
  const needle = normalize(stripped) || normalize(propertyText);
  if (!needle) return null;

  const exact = properties.filter((p) => normalize(p.name) === needle);
  if (exact.length === 1) return exact[0].id;

  const scored = properties
    .map((p) => ({ id: p.id, score: diceCoefficient(needle, normalize(p.name)) }))
    .sort((a, b) => b.score - a.score);

  const [best, runnerUp] = scored;
  const CONFIDENT_THRESHOLD = 0.5;
  const MIN_LEAD = 0.15; // best must clearly beat the next-closest property
  if (best && best.score >= CONFIDENT_THRESHOLD && (!runnerUp || best.score - runnerUp.score >= MIN_LEAD)) {
    return best.id;
  }
  return null;
}
