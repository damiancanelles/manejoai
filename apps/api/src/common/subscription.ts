import { Prisma } from '@prisma/client';

/**
 * The one rule for "is this business allowed to use the app right now" -
 * active, or still within its trial. Used both by SubscriptionGuard (HTTP
 * routes) and by anything that runs on its own schedule/trigger rather than
 * behind a guard - the weekly reminder digest/daily flagging cron
 * (RemindersService) and incoming Telegram messages (TelegramService) both
 * have to check this explicitly, since a lock has to actually stop every
 * automated feature, not just the ones a logged-in user directly clicks.
 */
export function isBusinessSubscribed(business: { subscriptionStatus: string; trialEndsAt: Date | null }): boolean {
  if (business.subscriptionStatus === 'active') return true;
  if (business.subscriptionStatus === 'trialing' && business.trialEndsAt && business.trialEndsAt > new Date()) {
    return true;
  }
  return false;
}

/**
 * Same rule as isBusinessSubscribed(), as a Prisma where-fragment for bulk
 * queries that aren't scoped to one already-loaded business row - the
 * reminders cron sweeps every business at once, so it needs this applied at
 * the query level rather than fetching everything and filtering in JS.
 */
export function subscriptionActiveWhere(now: Date = new Date()): Prisma.BusinessWhereInput {
  return {
    OR: [{ subscriptionStatus: 'active' }, { subscriptionStatus: 'trialing', trialEndsAt: { gt: now } }],
  };
}
