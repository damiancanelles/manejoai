import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RemindersService } from './reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  // Manual trigger for testing without waiting for the daily flagging /
  // weekly digest cron jobs. Pass accountId to scope it to one customer -
  // used by the "Send payment reminder" button on the account page.
  @Post('run')
  async run(@Query('accountId') accountId?: string) {
    const flaggedOverdue = await this.remindersService.flagOverdueInvoices(accountId);
    const digest = await this.remindersService.sendOverdueDigest(accountId);
    return { flaggedOverdue, ...digest };
  }
}
