import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

// The "Manejoai Platform" business (see scripts/create-superadmin.ts) is
// just a required home for super-admin User rows, not a real tenant - every
// count/list here excludes it so it doesn't skew "how many businesses are
// actually using this."
const REAL_BUSINESS_WHERE: Prisma.BusinessWhereInput = { users: { none: { role: 'SUPERADMIN' } } };

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  /** Top-line counts across every real business - the small dashboard's stat tiles. */
  async getStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      totalBusinesses,
      newBusinesses7d,
      newBusinesses30d,
      totalUsers,
      totalAccounts,
      totalInvoices,
      invoiceAmounts,
      invoicesCreated7d,
      businessesWithTelegram,
    ] = await Promise.all([
      this.prisma.business.count({ where: REAL_BUSINESS_WHERE }),
      this.prisma.business.count({ where: { ...REAL_BUSINESS_WHERE, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.business.count({ where: { ...REAL_BUSINESS_WHERE, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { role: { not: 'SUPERADMIN' } } }),
      this.prisma.account.count({ where: { business: REAL_BUSINESS_WHERE } }),
      this.prisma.invoice.count({ where: { business: REAL_BUSINESS_WHERE } }),
      this.prisma.invoice.aggregate({
        where: { business: REAL_BUSINESS_WHERE, status: { not: InvoiceStatus.CANCELED } },
        _sum: { amountCents: true },
      }),
      this.prisma.invoice.count({ where: { business: REAL_BUSINESS_WHERE, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.business.count({ where: { ...REAL_BUSINESS_WHERE, telegramBotToken: { not: null } } }),
    ]);

    return {
      totalBusinesses,
      newBusinesses7d,
      newBusinesses30d,
      totalUsers,
      totalAccounts,
      totalInvoices,
      totalInvoicedCents: invoiceAmounts._sum.amountCents ?? 0,
      invoicesCreated7d,
      businessesWithTelegram,
    };
  }

  /**
   * One row per real business - not a tenant's own analytics, just enough
   * for "is this business actually using it / is anything stuck" at a
   * glance. Small number of businesses expected, so per-business queries
   * in a loop are simpler than one giant join and plenty fast.
   */
  async getBusinesses() {
    const businesses = await this.prisma.business.findMany({
      where: REAL_BUSINESS_WHERE,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      businesses.map(async (b) => {
        const [userCount, accountCount, invoiceCount, invoiceAmounts, lastInvoice, lastJob] = await Promise.all([
          this.prisma.user.count({ where: { businessId: b.id } }),
          this.prisma.account.count({ where: { businessId: b.id } }),
          this.prisma.invoice.count({ where: { businessId: b.id } }),
          this.prisma.invoice.aggregate({
            where: { businessId: b.id, status: { not: InvoiceStatus.CANCELED } },
            _sum: { amountCents: true },
          }),
          this.prisma.invoice.findFirst({
            where: { businessId: b.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
          this.prisma.job.findFirst({
            where: { account: { businessId: b.id } },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]);

        const lastActivityAt =
          [lastInvoice?.createdAt, lastJob?.createdAt]
            .filter((d): d is Date => !!d)
            .sort((a, c) => c.getTime() - a.getTime())[0] ?? null;

        return {
          id: b.id,
          name: b.name,
          emailSlug: b.emailSlug,
          createdAt: b.createdAt,
          userCount,
          accountCount,
          invoiceCount,
          totalInvoicedCents: invoiceAmounts._sum.amountCents ?? 0,
          telegramConnected: !!b.telegramBotToken,
          telegramConfirmed: !!b.telegramConfirmedAt,
          lastActivityAt,
        };
      }),
    );
  }
}
