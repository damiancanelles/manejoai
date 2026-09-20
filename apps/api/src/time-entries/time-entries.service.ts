import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) {}

  private findOpenEntry(businessId: string, userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { businessId, userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });
  }

  async clockIn(businessId: string, userId: string) {
    const open = await this.findOpenEntry(businessId, userId);
    if (open) throw new BadRequestException('Already clocked in');
    return this.prisma.timeEntry.create({ data: { businessId, userId } });
  }

  async clockOut(businessId: string, userId: string) {
    const open = await this.findOpenEntry(businessId, userId);
    if (!open) throw new BadRequestException('Not currently clocked in');
    return this.prisma.timeEntry.update({ where: { id: open.id }, data: { clockOut: new Date() } });
  }

  async me(businessId: string, userId: string) {
    const [open, recent] = await Promise.all([
      this.findOpenEntry(businessId, userId),
      this.prisma.timeEntry.findMany({
        where: { businessId, userId },
        orderBy: { clockIn: 'desc' },
        take: 30,
      }),
    ]);
    return { open, recent };
  }

  // Business-wide (or one crew member's) raw entries, for the admin/staff
  // hours view - day/week totals are grouped client-side from these, same
  // pattern as the Dashboard/Reports pages already use for invoices.
  findAll(businessId: string, userId?: string, from?: string, to?: string) {
    return this.prisma.timeEntry.findMany({
      where: {
        businessId,
        userId,
        clockIn: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { clockIn: 'desc' },
    });
  }
}
