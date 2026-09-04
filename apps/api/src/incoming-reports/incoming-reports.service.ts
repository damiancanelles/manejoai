import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { ConvertReportDto } from './dto';

@Injectable()
export class IncomingReportsService {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  findAll(status?: ReportStatus) {
    return this.prisma.incomingReport.findMany({
      where: { status: status ?? ReportStatus.PENDING },
      include: { matchedProperty: { include: { account: true } } },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.incomingReport.findUnique({
      where: { id },
      include: { matchedProperty: { include: { account: true } } },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async convert(id: string, dto: ConvertReportDto, reviewedById: string) {
    const report = await this.findOne(id);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('This report was already reviewed');
    }

    const job = await this.jobsService.create(
      { accountId: dto.accountId, propertyId: dto.propertyId, title: dto.title, description: dto.description },
      reviewedById,
    );

    if (report.photoUrls.length > 0) {
      await this.prisma.jobPhoto.createMany({
        data: report.photoUrls.map((url) => ({ jobId: job.id, url })),
      });
    }

    await this.prisma.incomingReport.update({
      where: { id },
      data: { status: ReportStatus.CONVERTED, jobId: job.id, reviewedById, reviewedAt: new Date() },
    });

    return job;
  }

  async dismiss(id: string, reviewedById: string) {
    const report = await this.findOne(id);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('This report was already reviewed');
    }
    return this.prisma.incomingReport.update({
      where: { id },
      data: { status: ReportStatus.DISMISSED, reviewedById, reviewedAt: new Date() },
    });
  }
}
