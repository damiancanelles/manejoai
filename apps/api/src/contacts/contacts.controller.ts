import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Post()
  create(@Body() dto: CreateContactDto, @CurrentUser() user: { businessId: string }) {
    return this.contactsService.create(dto, user.businessId);
  }

  @Get()
  findForAccount(@Query('accountId') accountId: string, @CurrentUser() user: { businessId: string }) {
    return this.contactsService.findForAccount(accountId, user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.contactsService.findOne(id, user.businessId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto, @CurrentUser() user: { businessId: string }) {
    return this.contactsService.update(id, dto, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.contactsService.remove(id, user.businessId);
  }
}
