import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { buildPropertyStatement } from '../common/statements';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard, CrewGuard)
@Controller('properties')
export class PropertiesController {
  constructor(
    private propertiesService: PropertiesService,
    private prisma: PrismaService,
  ) {}

  @Post()
  create(@Body() dto: CreatePropertyDto, @CurrentUser() user: { businessId: string }) {
    return this.propertiesService.create(dto, user.businessId);
  }

  @Get()
  findForAccount(@Query('accountId') accountId: string, @CurrentUser() user: { businessId: string }) {
    return this.propertiesService.findForAccount(accountId, user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.propertiesService.findOne(id, user.businessId);
  }

  @Get(':id/statement')
  statement(
    @Param('id') id: string,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: { businessId: string },
  ) {
    return buildPropertyStatement(this.prisma, id, user.businessId, dateFrom, dateTo);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @CurrentUser() user: { businessId: string }) {
    return this.propertiesService.update(id, dto, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.propertiesService.remove(id, user.businessId);
  }
}
