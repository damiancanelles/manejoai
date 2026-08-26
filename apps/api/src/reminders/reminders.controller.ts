import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RemindersService } from './reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  // Manual trigger for testing without waiting for the daily cron.
  @Post('run')
  async run() {
    const flagged = await this.remindersService.flagOverdueInvoices();
    const sent = await this.remindersService.sendDueReminders();
    return { flaggedOverdue: flagged, remindersSent: sent };
  }
}
