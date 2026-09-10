import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto, @CurrentUser() user: { userId: string; businessId: string }) {
    return this.jobsService.create(dto, user.userId, user.businessId);
  }

  @Get()
  findAll(
    @Query('status') status: JobStatus | undefined,
    @Query('accountId') accountId: string | undefined,
    @Query('search') search: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: { businessId: string },
  ) {
    return this.jobsService.findAll({ status, accountId, search, dateFrom, dateTo }, user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.jobsService.findOne(id, user.businessId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto, @CurrentUser() user: { businessId: string }) {
    return this.jobsService.update(id, dto, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.jobsService.remove(id, user.businessId);
  }

  // multipart/form-data with a "file" field (and optional "caption")
  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file'))
  addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { businessId: string },
    @Body('caption') caption?: string,
  ) {
    return this.jobsService.addPhoto(id, file, user.businessId, caption);
  }
}
