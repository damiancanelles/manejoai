-- Quote numbers become unique per business instead of one shared global
-- sequence (mirrors the earlier per-business Invoice numbering fix) - two
-- businesses independently reaching their own Nth quote were colliding on
-- the old globally-unique quoteNumber and the second create would fail.

ALTER TABLE "Quote" ADD COLUMN "businessId" TEXT;
UPDATE "Quote" q SET "businessId" = a."businessId" FROM "Account" a WHERE a."id" = q."accountId";
ALTER TABLE "Quote" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "Quote_quoteNumber_key";
CREATE UNIQUE INDEX "Quote_businessId_quoteNumber_key" ON "Quote"("businessId", "quoteNumber");
