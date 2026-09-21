import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualTimeEntryDto, UpdateTimeEntryDto } from './dto';

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) {}

  private findOpenEntry(businessId: string, userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { businessId, userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });
  }

  private async assertSameBusiness(businessId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { businessId: true } });
    if (!user || user.businessId !== businessId) throw new NotFoundException('Team member not found');
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

  // Same as clockIn/clockOut above, but triggered by an admin/staff member
  // on someone else's behalf (they forgot to use the app) - see
  // TimeEntriesController's :userId routes. assertSameBusiness stops an
  // admin from (accidentally or otherwise) creating an entry for a userId
  // outside their own business.
  async clockInFor(businessId: string, userId: string) {
    await this.assertSameBusiness(businessId, userId);
    return this.clockIn(businessId, userId);
  }

  async clockOutFor(businessId: string, userId: string) {
    await this.assertSameBusiness(businessId, userId);
    return this.clockOut(businessId, userId);
  }

  // A fully missed day (the crew member never opened the app at all) -
  // admin/staff enters both times by hand. clockOut is optional so this can
  // also backfill an already-finished, entirely-missed shift in one go.
  async createManual(businessId: string, dto: CreateManualTimeEntryDto) {
    await this.assertSameBusiness(businessId, dto.userId);
    const clockIn = new Date(dto.clockIn);
    const clockOut = dto.clockOut ? new Date(dto.clockOut) : null;
    if (clockOut && clockOut <= clockIn) {
      throw new BadRequestException('Clock-out must be after clock-in');
    }
    return this.prisma.timeEntry.create({ data: { businessId, userId: dto.userId, clockIn, clockOut } });
  }

  private async findOwnedEntry(id: string, businessId: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry || entry.businessId !== businessId) throw new NotFoundException('Time entry not found');
    return entry;
  }

  // Correcting a wrong clock-in/clock-out time - either field can be fixed
  // independently.
  async update(id: string, businessId: string, dto: UpdateTimeEntryDto) {
    const entry = await this.findOwnedEntry(id, businessId);
    const clockIn = dto.clockIn ? new Date(dto.clockIn) : entry.clockIn;
    const clockOut = dto.clockOut ? new Date(dto.clockOut) : entry.clockOut;
    if (clockOut && clockOut <= clockIn) {
      throw new BadRequestException('Clock-out must be after clock-in');
    }
    return this.prisma.timeEntry.update({ where: { id }, data: { clockIn, clockOut } });
  }

  // Removing a duplicate/erroneous entry entirely.
  async remove(id: string, businessId: string) {
    await this.findOwnedEntry(id, businessId);
    await this.prisma.timeEntry.delete({ where: { id } });
    return { ok: true };
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
