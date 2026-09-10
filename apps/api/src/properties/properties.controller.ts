import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @CurrentUser() user: { businessId: string }) {
    return this.propertiesService.update(id, dto, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.propertiesService.remove(id, user.businessId);
  }
}
