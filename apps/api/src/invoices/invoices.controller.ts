import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateInvoiceDto, InvoiceItemInputDto, UpdateInvoiceDto, UpdateInvoiceItemDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private paymentsService: PaymentsService,
  ) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: { userId: string }) {
    return this.invoicesService.create(dto, user.userId);
  }

  @Get()
  findAll(
    @Query('status') status?: InvoiceStatus,
    @Query('accountId') accountId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('full') full?: string,
  ) {
    return this.invoicesService.findAll({ status, accountId, dateFrom, dateTo, full: full === 'true' });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Post('send-drafts')
  sendAllDrafts() {
    return this.invoicesService.sendAllDrafts();
  }

  @Post('send-report')
  sendInvoicesReport(
    @Query('status') status?: InvoiceStatus,
    @Query('accountId') accountId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.invoicesService.sendInvoicesReport({ status, accountId, dateFrom, dateTo });
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: InvoiceItemInputDto) {
    return this.invoicesService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInvoiceItemDto,
  ) {
    return this.invoicesService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.invoicesService.removeItem(id, itemId);
  }

  @Post(':id/mark-sent')
  markSent(@Param('id') id: string) {
    return this.invoicesService.markSent(id);
  }

  // Goes through PaymentsService so a single invoice marked paid this way
  // gets the same Payment record (with one invoice in it) as a batch
  // payment does - one consistent trail for every paid invoice.
  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.paymentsService.record({ invoiceIds: [id], paidAt: new Date().toISOString() }, user.userId);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.invoicesService.cancel(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
