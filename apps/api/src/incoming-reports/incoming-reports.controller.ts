import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IncomingReportsService } from './incoming-reports.service';
import { ConvertReportDto } from './dto';

type AuthedUser = { userId: string; businessId: string };

@UseGuards(JwtAuthGuard)
@Controller('incoming-reports')
export class IncomingReportsController {
  constructor(private incomingReportsService: IncomingReportsService) {}

  @Get()
  findAll(
    @Query('status') status: ReportStatus | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.incomingReportsService.findAll(user.businessId, status, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.incomingReportsService.findOne(id, user.businessId);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() dto: ConvertReportDto, @CurrentUser() user: AuthedUser) {
    return this.incomingReportsService.convert(id, dto, user.userId, user.businessId);
  }

  @Post(':id/dismiss')
  dismiss(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.incomingReportsService.dismiss(id, user.userId, user.businessId);
  }
}
