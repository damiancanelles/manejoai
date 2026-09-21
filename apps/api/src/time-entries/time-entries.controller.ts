import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TimeEntriesService } from './time-entries.service';
import { CreateManualTimeEntryDto, UpdateTimeEntryDto } from './dto';

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

  // ---- Admin/staff fixing a team member's hours (Team member detail page) ----

  // Clock a specific team member in/out right now, on their behalf - for
  // when they forgot to use the app themselves.
  @UseGuards(CrewGuard)
  @Post(':userId/clock-in')
  @HttpCode(200)
  clockInFor(@Param('userId') userId: string, @CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.clockInFor(user.businessId, userId);
  }

  @UseGuards(CrewGuard)
  @Post(':userId/clock-out')
  @HttpCode(200)
  clockOutFor(@Param('userId') userId: string, @CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.clockOutFor(user.businessId, userId);
  }

  // A fully missed shift - both times entered by hand.
  @UseGuards(CrewGuard)
  @Post()
  createManual(@Body() dto: CreateManualTimeEntryDto, @CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.createManual(user.businessId, dto);
  }

  // Correcting an existing entry's clock-in/clock-out time.
  @UseGuards(CrewGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTimeEntryDto, @CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.update(id, user.businessId, dto);
  }

  // Removing a duplicate/erroneous entry.
  @UseGuards(CrewGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.timeEntriesService.remove(id, user.businessId);
  }
}
