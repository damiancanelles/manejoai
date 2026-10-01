import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { buildAccountStatement } from '../common/statements';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard, CrewGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private accountsService: AccountsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  create(@Body() dto: CreateAccountDto, @CurrentUser() user: { businessId: string }) {
    return this.accountsService.create(dto, user.businessId);
  }

  @Get()
  findAll(@Query('search') search: string | undefined, @CurrentUser() user: { businessId: string }) {
    return this.accountsService.findAll(user.businessId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.accountsService.findOne(id, user.businessId);
  }

  @Get(':id/statement')
  statement(
    @Param('id') id: string,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: { businessId: string },
  ) {
    return buildAccountStatement(this.prisma, id, user.businessId, dateFrom, dateTo);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto, @CurrentUser() user: { businessId: string }) {
    return this.accountsService.update(id, dto, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.accountsService.remove(id, user.businessId);
  }
}
