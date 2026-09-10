import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, QuoteItemInputDto, UpdateQuoteDto, UpdateQuoteItemDto } from './dto';

type AuthedUser = { userId: string; businessId: string };

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthedUser) {
    return this.quotesService.create(dto, user.userId, user.businessId);
  }

  @Get()
  findAll(
    @Query('status') status: QuoteStatus | undefined,
    @Query('accountId') accountId: string | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.quotesService.findAll({ status, accountId, search }, user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.quotesService.findOne(id, user.businessId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto, @CurrentUser() user: AuthedUser) {
    return this.quotesService.update(id, dto, user.businessId);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: QuoteItemInputDto, @CurrentUser() user: AuthedUser) {
    return this.quotesService.addItem(id, dto, user.businessId);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateQuoteItemDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.quotesService.updateItem(id, itemId, dto, user.businessId);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: AuthedUser) {
    return this.quotesService.removeItem(id, itemId, user.businessId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.quotesService.approve(id, user.userId, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.quotesService.remove(id, user.businessId);
  }
}
