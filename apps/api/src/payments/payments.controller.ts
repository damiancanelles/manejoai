import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard, CrewGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  record(@Body() dto: RecordPaymentDto, @CurrentUser() user: { userId: string; businessId: string }) {
    return this.paymentsService.record(dto, user.userId, user.businessId);
  }

  @Get()
  findAll(
    @Query('accountId') accountId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: { businessId: string },
  ) {
    return this.paymentsService.findAll({ accountId, dateFrom, dateTo }, user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.paymentsService.findOne(id, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.paymentsService.remove(id, user.businessId);
  }
}
