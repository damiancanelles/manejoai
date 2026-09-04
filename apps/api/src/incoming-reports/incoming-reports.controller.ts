import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IncomingReportsService } from './incoming-reports.service';
import { ConvertReportDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('incoming-reports')
export class IncomingReportsController {
  constructor(private incomingReportsService: IncomingReportsService) {}

  @Get()
  findAll(@Query('status') status?: ReportStatus) {
    return this.incomingReportsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incomingReportsService.findOne(id);
  }

  @Post(':id/convert')
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertReportDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.incomingReportsService.convert(id, dto, user.userId);
  }

  @Post(':id/dismiss')
  dismiss(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.incomingReportsService.dismiss(id, user.userId);
  }
}
