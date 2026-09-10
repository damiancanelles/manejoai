import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ReportParsingService } from './report-parsing.service';
import { isBusinessSubscribed } from '../common/subscription';
import { ImageMediaType, TelegramMessage, TelegramUpdate } from './types';

const DEBOUNCE_MS = 90_000;
const MAX_IMAGES_TO_CLAUDE = 5; // keep the vision request small even if a worker sends a big album

interface BufferedBurst {
  businessId: string;
  botToken: string;
  senderName?: string;
  textParts: string[];
  photoUrls: string[];
  images: { buffer: Buffer; contentType: ImageMediaType }[];
  timer?: NodeJS.Timeout;
}

/**
 * Receives Telegram webhook updates from a business's own job-reports group
 * and turns a burst of messages from one sender (photos + a caption,
 * typically) into one IncomingReport - buffered in memory per (business,
 * sender) for DEBOUNCE_MS so a photo album + a follow-up caption become one
 * report instead of several. Each business has its own bot/webhook (see
 * TelegramSetupService) so everything here is scoped by businessId.
 */
@Injectable()
export class TelegramService {
  private logger = new Logger(TelegramService.name);
  private buffers = new Map<string, BufferedBurst>(); // keyed by `${businessId}:${telegramSenderId}`

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private parser: ReportParsingService,
  ) {}

  async handleUpdate(businessId: string, update: TelegramUpdate) {
    const message = update.message;
    if (!message) return;

    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business?.telegramBotToken) return; // shouldn't happen (the webhook guard already checked a secret exists), but be defensive

    // A locked-out business (subscription lapsed) stops here too - this
    // isn't behind a JwtAuthGuard/SubscriptionGuard at all (Telegram calls
    // it, not a logged-in user), so it has to check for itself. Nothing is
    // buffered/stored; Telegram still gets its normal 200 (see the
    // controller) so it doesn't keep retrying.
    if (!isBusinessSubscribed(business)) return;

    // The very first message this bot ever sees is how we learn which chat
    // is "the" job-reports group - captured automatically instead of asking
    // the business to find and enter a chat id by hand.
    if (!business.telegramGroupChatId) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: { telegramGroupChatId: String(message.chat.id), telegramGroupTitle: message.chat.title ?? null },
      });
      this.logger.log(`Linked business ${businessId} to Telegram chat ${message.chat.id} ("${message.chat.title ?? 'n/a'}")`);
    } else if (String(message.chat.id) !== business.telegramGroupChatId) {
      return; // a different chat than the one this business linked - ignore
    }

    await this.bufferMessage(businessId, business.telegramBotToken, message);
  }

  private async bufferMessage(businessId: string, botToken: string, message: TelegramMessage) {
    const senderId = message.from?.id ?? 0;
    const bufferKey = `${businessId}:${senderId}`;
    const senderName =
      [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || message.from?.username;

    let burst = this.buffers.get(bufferKey);
    if (!burst) {
      burst = { businessId, botToken, senderName, textParts: [], photoUrls: [], images: [] };
      this.buffers.set(bufferKey, burst);
    }

    const text = message.text || message.caption;
    if (text) burst.textParts.push(text);

    if (message.photo && message.photo.length > 0) {
      try {
        const largest = message.photo[message.photo.length - 1]; // Telegram lists sizes smallest-first
        const { buffer, contentType } = await this.downloadTelegramFile(botToken, largest.file_id);
        const url = await this.storage.saveReportPhoto(`pending-${senderId}-${Date.now()}`, buffer, contentType);
        burst.photoUrls.push(url);
        if (burst.images.length < MAX_IMAGES_TO_CLAUDE) burst.images.push({ buffer, contentType });
      } catch (err) {
        this.logger.error(`Failed to download/store a Telegram photo: ${(err as Error).message}`);
      }
    }

    if (burst.timer) clearTimeout(burst.timer);
    burst.timer = setTimeout(() => {
      this.buffers.delete(bufferKey);
      this.finalizeBurst(burst!).catch((err) =>
        this.logger.error(`Failed to finalize report burst: ${(err as Error).message}`),
      );
    }, DEBOUNCE_MS);
  }

  private async finalizeBurst(burst: BufferedBurst) {
    const rawText = burst.textParts.join('\n\n') || null;
    if (!rawText && burst.photoUrls.length === 0) return; // nothing worth keeping

    let suggestedTitle: string | null = null;
    let suggestedDescription: string | null = null;
    let suggestedPropertyText: string | null = null;
    let matchedPropertyId: string | null = null;

    try {
      const parsed = await this.parser.parse(rawText ?? '', burst.images);
      suggestedTitle = parsed.title;
      suggestedDescription = parsed.description;
      suggestedPropertyText = parsed.propertyText;
      if (parsed.propertyText) {
        matchedPropertyId = await this.matchProperty(burst.businessId, parsed.propertyText);
      }
    } catch (err) {
      // Still save the raw report even if Claude parsing failed - staff can
      // fill in the fields by hand from the photos/text either way.
      this.logger.error(`Claude parsing failed, saving report unparsed: ${(err as Error).message}`);
    }

    const report = await this.prisma.incomingReport.create({
      data: {
        businessId: burst.businessId,
        senderName: burst.senderName,
        rawText,
        photoUrls: burst.photoUrls,
        suggestedTitle,
        suggestedDescription,
        suggestedPropertyText,
        matchedPropertyId,
      },
    });
    this.logger.log(
      `Created IncomingReport ${report.id} for business ${burst.businessId} from ${burst.senderName ?? 'unknown sender'} (${burst.photoUrls.length} photo(s))`,
    );
  }

  /**
   * Match against this business's real Property names - tolerant of the
   * kind of thing workers actually type: typos ("Vinning Montain" for
   * "Vinings Mountain") and a unit/apartment number tacked on that
   * Property.name doesn't have ("Vinings Mountain - Unit 533"). Exact match
   * wins outright; otherwise falls back to bigram similarity and only
   * returns a match if it's both confident and clearly ahead of the
   * next-closest property - ambiguous or weak matches are left null for
   * staff to resolve manually.
   */
  private async matchProperty(businessId: string, propertyText: string): Promise<string | null> {
    const properties = await this.prisma.property.findMany({
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

  private async downloadTelegramFile(
    botToken: string,
    fileId: string,
  ): Promise<{ buffer: Buffer; contentType: ImageMediaType }> {
    const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const info: any = await infoRes.json();
    if (!info.ok) throw new Error(`Telegram getFile failed: ${JSON.stringify(info)}`);

    const filePath: string = info.result.file_path;
    const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const contentType: ImageMediaType = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return { buffer, contentType };
  }
}

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
