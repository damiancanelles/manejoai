import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { CrewGuard } from '../common/guards/crew.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ChangePasswordDto, CreateCrewUserDto, RegisterPushTokenDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Every logged-in user (staff, admin, or crew) can change their own
  // password - there's no "manage other users" surface for this, just this
  // self-service one.
  @Patch('me/password')
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: { userId: string }) {
    return this.usersService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  // Called by the mobile app once it has notification permission and an
  // Expo push token - registration only, see UsersService.registerPushToken.
  @Patch('me/push-token')
  registerPushToken(@Body() dto: RegisterPushTokenDto, @CurrentUser() user: { userId: string }) {
    return this.usersService.registerPushToken(user.userId, dto.token);
  }

  // ---- Crew (Team) management - ADMIN/STAFF only, see CrewGuard ----

  @UseGuards(SubscriptionGuard, CrewGuard)
  @Post()
  createCrew(@Body() dto: CreateCrewUserDto, @CurrentUser() user: { businessId: string }) {
    return this.usersService.createCrewUser(user.businessId, dto);
  }

  @UseGuards(SubscriptionGuard, CrewGuard)
  @Get()
  listCrew(@CurrentUser() user: { businessId: string }) {
    return this.usersService.listCrew(user.businessId);
  }

  @UseGuards(SubscriptionGuard, CrewGuard)
  @Delete(':id')
  deactivateCrew(@Param('id') id: string, @CurrentUser() user: { businessId: string }) {
    return this.usersService.deactivateCrewUser(id, user.businessId);
  }
}
