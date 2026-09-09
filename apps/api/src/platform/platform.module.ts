import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';

@Module({
  providers: [PlatformService, SuperAdminGuard],
  controllers: [PlatformController],
})
export class PlatformModule {}
