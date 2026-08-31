import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateJobDto, UpdateJobDto } from './dto';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  create(dto: CreateJobDto, createdById: string) {
    return this.prisma.job.create({
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        createdById,
      },
    });
  }

  findAll(filters: {
    status?: JobStatus;
    accountId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return this.prisma.job.findMany({
      where: {
        status: filters.status,
        accountId: filters.accountId,
        createdAt:
          filters.dateFrom || filters.dateTo
            ? {
                gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                // end-of-day so a "to" date includes jobs logged that same day
                lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
              }
            : undefined,
        ...(filters.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: 'insensitive' as const } },
                { description: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { account: true, property: true, photos: true },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { account: true, photos: true, invoices: true, property: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, dto: UpdateJobDto) {
    const existing = await this.findOne(id);

    const changingAccount = dto.accountId !== undefined && dto.accountId !== existing.accountId;
    if (changingAccount && existing.invoices.length > 0) {
      throw new BadRequestException(
        'This job has invoices attached, so it cannot be reassigned to a different customer.',
      );
    }

    // A property belongs to one account - if the job just moved to a new
    // account and the caller didn't also specify a property, don't silently
    // carry over a property that belongs to the old customer.
    const propertyId =
      dto.propertyId !== undefined ? dto.propertyId : changingAccount ? null : undefined;

    return this.prisma.job.update({
      where: { id },
      data: {
        ...dto,
        propertyId,
        scheduledAt:
          dto.scheduledAt !== undefined
            ? dto.scheduledAt === null
              ? null
              : new Date(dto.scheduledAt)
            : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.job.delete({ where: { id } });
    return { ok: true };
  }

  async addPhoto(jobId: string, file: Express.Multer.File, caption?: string) {
    await this.findOne(jobId);
    const url = await this.storage.saveJobPhoto(jobId, file);
    return this.prisma.jobPhoto.create({ data: { jobId, url, caption } });
  }
}
