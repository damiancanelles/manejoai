import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ChangePasswordDto, RegisterPushTokenDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Every logged-in user (staff or admin) can change their own password -
  // there's no "manage other users" surface yet, just this self-service one.
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
}
