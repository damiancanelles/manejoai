-- Telegram job-report intake becomes per-business: each business provides
-- its own bot token instead of one shared TELEGRAM_BOT_TOKEN/
-- TELEGRAM_GROUP_CHAT_ID/TELEGRAM_WEBHOOK_SECRET env var for the whole
-- deployment.

ALTER TABLE "Business" ADD COLUMN "telegramBotToken" TEXT;
ALTER TABLE "Business" ADD COLUMN "telegramBotUsername" TEXT;
ALTER TABLE "Business" ADD COLUMN "telegramWebhookSecret" TEXT;
ALTER TABLE "Business" ADD COLUMN "telegramGroupChatId" TEXT;
ALTER TABLE "Business" ADD COLUMN "telegramGroupTitle" TEXT;
ALTER TABLE "Business" ADD COLUMN "telegramConfirmedAt" TIMESTAMP(3);

-- IncomingReport.businessId - NOT NULL with no backfill step: this concept
-- didn't exist before this migration, so there's no sensible business to
-- assign an old row to. Fine everywhere this migration actually runs today
-- (zero existing IncomingReport rows) - if it's ever run somewhere with
-- real rows, it fails loudly instead of guessing, which is correct.
ALTER TABLE "IncomingReport" ADD COLUMN "businessId" TEXT NOT NULL;
CREATE INDEX "IncomingReport_businessId_idx" ON "IncomingReport"("businessId");
ALTER TABLE "IncomingReport" ADD CONSTRAINT "IncomingReport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
