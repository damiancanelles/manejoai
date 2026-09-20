import { Body, Controller, Get, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReportStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IncomingReportsService } from './incoming-reports.service';
import { ConvertReportDto, SubmitReportDto } from './dto';

type AuthedUser = { userId: string; businessId: string };

// CrewGuard is applied per-method below, not at the class level - crew
// accounts submit reports (see the POST route, added separately) but can't
// list/review/convert/dismiss them, so it can't cover every route here.
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('incoming-reports')
export class IncomingReportsController {
  constructor(private incomingReportsService: IncomingReportsService) {}

  // No CrewGuard - this is the whole point of a crew account. Multipart
  // form-data: "rawText" field + up to 5 "photos" files, same shape as
  // jobs.controller.ts's addPhoto route.
  @Post()
  @UseInterceptors(FilesInterceptor('photos', 5))
  submit(
    @Body() dto: SubmitReportDto,
    @UploadedFiles() photos: Express.Multer.File[],
    @CurrentUser() user: AuthedUser,
  ) {
    return this.incomingReportsService.submit(dto.rawText, photos ?? [], user.userId, user.businessId);
  }

  @UseGuards(CrewGuard)
  @Get()
  findAll(
    @Query('status') status: ReportStatus | undefined,
    @Query('search') search: string | undefined,
    @Query('submittedByUserId') submittedByUserId: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.incomingReportsService.findAll(user.businessId, status, search, submittedByUserId);
  }

  @UseGuards(CrewGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.incomingReportsService.findOne(id, user.businessId);
  }

  @UseGuards(CrewGuard)
  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() dto: ConvertReportDto, @CurrentUser() user: AuthedUser) {
    return this.incomingReportsService.convert(id, dto, user.userId, user.businessId);
  }

  @UseGuards(CrewGuard)
  @Post(':id/dismiss')
  dismiss(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.incomingReportsService.dismiss(id, user.userId, user.businessId);
  }
}
