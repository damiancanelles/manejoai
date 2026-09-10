-- Subscription billing: $5/mo per business via Stripe, 14-day trial, hard
-- lock on lapse (see SubscriptionGuard). Every existing business is
-- grandfathered to 'active' below - this feature didn't exist when they
-- registered, so it shouldn't lock them out now.

ALTER TABLE "Business" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing';
ALTER TABLE "Business" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Business" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Business" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");
CREATE UNIQUE INDEX "Business_stripeSubscriptionId_key" ON "Business"("stripeSubscriptionId");

UPDATE "Business" SET "subscriptionStatus" = 'active';
