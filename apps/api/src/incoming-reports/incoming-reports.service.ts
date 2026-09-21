import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { ReportParsingService } from '../telegram/report-parsing.service';
import { ImageMediaType } from '../telegram/types';
import { StorageService } from '../storage/storage.service';
import { matchPropertyByText } from '../common/property-matching';
import { ConvertReportDto } from './dto';

@Injectable()
export class IncomingReportsService {
  private logger = new Logger(IncomingReportsService.name);

  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
    private reportParser: ReportParsingService,
    private storage: StorageService,
  ) {}

  findAll(businessId: string, status?: ReportStatus, search?: string, submittedByUserId?: string) {
    return this.prisma.incomingReport.findMany({
      where: {
        businessId,
        status,
        submittedByUserId,
        ...(search
          ? {
              OR: [
                { senderName: { contains: search, mode: 'insensitive' as const } },
                { rawText: { contains: search, mode: 'insensitive' as const } },
                { suggestedTitle: { contains: search, mode: 'insensitive' as const } },
                { suggestedPropertyText: { contains: search, mode: 'insensitive' as const } },
                { matchedProperty: { name: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: { matchedProperty: { include: { account: true } } },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(id: string, businessId: string) {
    const report = await this.prisma.incomingReport.findUnique({
      where: { id },
      include: { matchedProperty: { include: { account: true } } },
    });
    if (!report || report.businessId !== businessId) throw new NotFoundException('Report not found');
    return report;
  }

  async convert(id: string, dto: ConvertReportDto, reviewedById: string, businessId: string) {
    const report = await this.findOne(id, businessId);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('This report was already reviewed');
    }

    const job = await this.jobsService.create(
      { accountId: dto.accountId, propertyId: dto.propertyId, title: dto.title, description: dto.description },
      reviewedById,
      businessId,
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

  async dismiss(id: string, reviewedById: string, businessId: string) {
    const report = await this.findOne(id, businessId);
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('This report was already reviewed');
    }
    return this.prisma.incomingReport.update({
      where: { id },
      data: { status: ReportStatus.DISMISSED, reviewedById, reviewedAt: new Date() },
    });
  }

  // A crew member's own submission (source "app") - same shape as a
  // Telegram report once saved, so it goes through the exact same
  // review/convert screens, property auto-match included.
  async submit(rawText: string | undefined, photos: Express.Multer.File[], submittedByUserId: string, businessId: string) {
    const submitter = await this.prisma.user.findUnique({ where: { id: submittedByUserId }, select: { name: true } });

    let suggestedTitle: string | null = null;
    let suggestedDescription: string | null = null;
    let suggestedPropertyText: string | null = null;
    let matchedPropertyId: string | null = null;

    try {
      const images = photos.map((f) => ({ buffer: f.buffer, contentType: f.mimetype as ImageMediaType }));
      const parsed = await this.reportParser.parse(rawText ?? '', images);
      suggestedTitle = parsed.title;
      suggestedDescription = parsed.description;
      suggestedPropertyText = parsed.propertyText;
      if (parsed.propertyText) {
        matchedPropertyId = await matchPropertyByText(this.prisma, businessId, parsed.propertyText);
      }
    } catch (err) {
      // Still save the raw report even if Claude parsing failed - the
      // reviewer can fill in the fields by hand from the photos/text.
      this.logger.error(`Claude parsing failed, saving report unparsed: ${(err as Error).message}`);
    }

    const report = await this.prisma.incomingReport.create({
      data: {
        businessId,
        source: 'app',
        senderName: submitter?.name ?? null,
        submittedByUserId,
        rawText: rawText || null,
        suggestedTitle,
        suggestedDescription,
        suggestedPropertyText,
        matchedPropertyId,
      },
    });

    if (photos.length > 0) {
      const photoUrls = await Promise.all(
        photos.map((file) => this.storage.saveReportPhoto(report.id, file.buffer, file.mimetype)),
      );
      await this.prisma.incomingReport.update({ where: { id: report.id }, data: { photoUrls } });
    }

    return this.findOne(report.id, businessId);
  }
}
