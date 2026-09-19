-- Expo push token for the mobile app - nullable, no backfill needed
-- (nobody has one yet). See the mobile build plan's WO-1: this is the
-- registration side only, nothing sends a push yet.
ALTER TABLE "User" ADD COLUMN "expoPushToken" TEXT;
