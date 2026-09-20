-- A field worker's restricted sub-account - can only submit job reports
-- and clock in/out (see StaffRole in schema.prisma).
ALTER TYPE "StaffRole" ADD VALUE 'CREW';

-- Deactivating a crew member sets this false instead of deleting the row,
-- so their TimeEntry/IncomingReport history stays intact. Backfills true
-- for every existing user.
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- Real attribution for a crew member's own submitted report, unlike
-- Telegram's free-text senderName (no worker accounts existed for that).
ALTER TABLE "IncomingReport" ADD COLUMN "submittedByUserId" TEXT;
ALTER TABLE "IncomingReport" ADD CONSTRAINT "IncomingReport_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One clock-in/clock-out pair per shift. An open entry (clockOut NULL) is
-- "currently clocked in".
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOut" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeEntry_businessId_userId_idx" ON "TimeEntry"("businessId", "userId");

ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
