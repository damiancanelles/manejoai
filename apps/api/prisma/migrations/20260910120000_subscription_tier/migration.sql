-- Split the single subscription into Basic ($5) and Pro ($25, adds the AI
-- assistant). Default and backfill are "pro": a fresh business trials on
-- Pro, and every existing active subscriber is grandfathered to Pro.
ALTER TABLE "Business" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'pro';
