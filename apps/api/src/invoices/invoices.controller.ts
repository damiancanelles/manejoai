import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateInvoiceDto, InvoiceItemInputDto, UpdateInvoiceDto, UpdateInvoiceItemDto } from './dto';

type AuthedUser = { userId: string; businessId: string };

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private paymentsService: PaymentsService,
  ) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.create(dto, user.userId, user.businessId);
  }

  @Get()
  findAll(
    @Query('status') status: InvoiceStatus | undefined,
    @Query('accountId') accountId: string | undefined,
    @Query('propertyId') propertyId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('search') search: string | undefined,
    @Query('full') full: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.invoicesService.findAll(
      {
        status,
        accountId,
        propertyId,
        dateFrom,
        dateTo,
        search,
        full: full === 'true',
      },
      user.businessId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.findOne(id, user.businessId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.update(id, dto, user.businessId);
  }

  @Post('send-drafts')
  sendAllDrafts(@CurrentUser() user: AuthedUser) {
    return this.invoicesService.sendAllDrafts(user.businessId);
  }

  @Post('send-report')
  sendInvoicesReport(
    @Query('status') status: InvoiceStatus | undefined,
    @Query('accountId') accountId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.invoicesService.sendInvoicesReport({ status, accountId, dateFrom, dateTo }, user.businessId);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: InvoiceItemInputDto, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.addItem(id, dto, user.businessId);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInvoiceItemDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.invoicesService.updateItem(id, itemId, dto, user.businessId);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.removeItem(id, itemId, user.businessId);
  }

  @Post(':id/mark-sent')
  markSent(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.markSent(id, user.businessId);
  }

  // Goes through PaymentsService so a single invoice marked paid this way
  // gets the same Payment record (with one invoice in it) as a batch
  // payment does - one consistent trail for every paid invoice.
  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.paymentsService.record(
      { invoiceIds: [id], paidAt: new Date().toISOString() },
      user.userId,
      user.businessId,
    );
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.cancel(id, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.invoicesService.remove(id, user.businessId);
  }
}
