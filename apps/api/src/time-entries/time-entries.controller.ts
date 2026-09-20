import { Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TimeEntriesService } from './time-entries.service';

type AuthedUser = { userId: string; businessId: string };

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  // Any role clocks itself in/out - crew's whole reason to use this app,
  // but nothing stops office staff from using it on themselves too.
  @Post('clock-in')
  @HttpCode(200)
  clockIn(@CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.clockIn(user.businessId, user.userId);
  }

  @Post('clock-out')
  @HttpCode(200)
  clockOut(@CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.clockOut(user.businessId, user.userId);
  }

  @Get('me')
  me(@CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.me(user.businessId, user.userId);
  }

  // Business-wide hours view - ADMIN/STAFF only.
  @UseGuards(CrewGuard)
  @Get()
  findAll(
    @Query('userId') userId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.timeEntriesService.findAll(user.businessId, userId, from, to);
  }
}
