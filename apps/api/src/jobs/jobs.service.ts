import { Injectable, NotFoundException } from '@nestjs/common';
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

  findForAccount(accountId: string) {
    return this.prisma.job.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      include: { photos: true },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { photos: true, invoices: true, property: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id);
    return this.prisma.job.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
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
