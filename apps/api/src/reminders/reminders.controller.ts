import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RemindersService } from './reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  // Manual trigger for testing without waiting for the daily flagging /
  // weekly digest cron jobs. Pass accountId to scope it to one customer -
  // used by the "Send payment reminder" button on the account page. Always
  // scoped to the caller's own business - never sweeps or emails on behalf
  // of another tenant.
  @Post('run')
  async run(@Query('accountId') accountId: string | undefined, @CurrentUser() user: { businessId: string }) {
    const flaggedOverdue = await this.remindersService.flagOverdueInvoices(accountId, user.businessId);
    const digest = await this.remindersService.sendOverdueDigest(accountId, user.businessId);
    return { flaggedOverdue, ...digest };
  }
}
