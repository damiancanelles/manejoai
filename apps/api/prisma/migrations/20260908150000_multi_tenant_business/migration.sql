-- Multi-tenant Business model. Every existing User and Account gets
-- attached to one backfilled "default" Business (the values today's static
-- COMPANY config falls back to) so nothing that already exists loses its
-- home; every business registered from here on gets its own row and its own
-- users/accounts, invisible to everyone else's.

CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Business" ("id", "name", "addressLine1", "addressLine2", "phone", "createdAt", "updatedAt")
VALUES ('default-business', 'SCG SERVICES LLC', '131 Hillcrest Dr SW', 'Austell, GA 30168-6737', '404-507-4044', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- User.businessId
ALTER TABLE "User" ADD COLUMN "businessId" TEXT;
UPDATE "User" SET "businessId" = 'default-business' WHERE "businessId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "businessId" SET NOT NULL;
CREATE INDEX "User_businessId_idx" ON "User"("businessId");
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Account.businessId
ALTER TABLE "Account" ADD COLUMN "businessId" TEXT;
UPDATE "Account" SET "businessId" = 'default-business' WHERE "businessId" IS NULL;
ALTER TABLE "Account" ALTER COLUMN "businessId" SET NOT NULL;
CREATE INDEX "Account_businessId_idx" ON "Account"("businessId");
ALTER TABLE "Account" ADD CONSTRAINT "Account_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
