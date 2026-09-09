-- Every business gets its own sending identity: emailSlug (the local part
-- of <slug>@manejoai.cloud, unique across all businesses) and an editable
-- replyToEmail - so a newly registered business can send professional
-- invoice/reminder emails without needing to verify its own domain in
-- Resend, instead of one shared MAIL_FROM env var for every tenant.

ALTER TABLE "Business" ADD COLUMN "emailSlug" TEXT;
ALTER TABLE "Business" ADD COLUMN "replyToEmail" TEXT;

-- Backfill from each business's own name (lowercased, non-alphanumeric
-- stripped) - matches slugify() in auth.service.ts so newly-registered
-- businesses get the same shape.
UPDATE "Business" SET "emailSlug" = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '', 'g')) WHERE "emailSlug" IS NULL;
UPDATE "Business" SET "emailSlug" = 'business' WHERE "emailSlug" = '' OR "emailSlug" IS NULL;

-- Disambiguate any collision the stripping above created (e.g. two
-- differently-punctuated names that stripped to the same slug) by
-- suffixing a fragment of the row's own id - deterministic, always unique.
UPDATE "Business" b SET "emailSlug" = b."emailSlug" || substr(b.id, 1, 6)
WHERE EXISTS (SELECT 1 FROM "Business" b2 WHERE b2."emailSlug" = b."emailSlug" AND b2.id <> b.id);

-- Backfill replyToEmail from each business's own oldest user - a real
-- inbox to start from, still editable in Settings afterward.
UPDATE "Business" b
SET "replyToEmail" = (
  SELECT u.email FROM "User" u WHERE u."businessId" = b.id ORDER BY u."createdAt" ASC LIMIT 1
)
WHERE b."replyToEmail" IS NULL;

ALTER TABLE "Business" ALTER COLUMN "emailSlug" SET NOT NULL;
CREATE UNIQUE INDEX "Business_emailSlug_key" ON "Business"("emailSlug");
