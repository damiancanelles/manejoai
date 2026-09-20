import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IncomingReportsService } from './incoming-reports.service';
import { ConvertReportDto } from './dto';

type AuthedUser = { userId: string; businessId: string };

// CrewGuard is applied per-method below, not at the class level - crew
// accounts submit reports (see the POST route, added separately) but can't
// list/review/convert/dismiss them, so it can't cover every route here.
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('incoming-reports')
export class IncomingReportsController {
  constructor(private incomingReportsService: IncomingReportsService) {}

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
