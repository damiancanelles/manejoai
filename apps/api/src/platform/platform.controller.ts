import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';
import { PlatformService } from './platform.service';

// Platform-only - every business's aggregate stats/activity, not any one
// tenant's own data. JwtAuthGuard runs first (populates request.user), then
// SuperAdminGuard checks the role on top of it.
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('platform')
export class PlatformController {
  constructor(private platformService: PlatformService) {}

  @Get('stats')
  getStats() {
    return this.platformService.getStats();
  }

  @Get('businesses')
  getBusinesses() {
    return this.platformService.getBusinesses();
  }
}
