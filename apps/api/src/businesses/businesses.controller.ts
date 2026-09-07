import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto';

// "me" only, same as UsersController's /users/me/password - no ":id" route
// at all, so there's no cross-tenant surface to guard: a caller can only
// ever read/update their own business, straight from their JWT.
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Get('me')
  findMine(@CurrentUser() user: { businessId: string }) {
    return this.businessesService.findOne(user.businessId);
  }

  @Patch('me')
  updateMine(@Body() dto: UpdateBusinessDto, @CurrentUser() user: { businessId: string }) {
    return this.businessesService.update(user.businessId, dto);
  }
}
