import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RemindersService } from './reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  // Manual trigger for testing without waiting for the daily flagging /
  // weekly digest cron jobs.
  @Post('run')
  async run() {
    const flaggedOverdue = await this.remindersService.flagOverdueInvoices();
    const digest = await this.remindersService.sendOverdueDigest();
    return { flaggedOverdue, ...digest };
  }
}
