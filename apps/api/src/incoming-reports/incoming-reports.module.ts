import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { TelegramModule } from '../telegram/telegram.module';
import { StorageModule } from '../storage/storage.module';
import { IncomingReportsController } from './incoming-reports.controller';
import { IncomingReportsService } from './incoming-reports.service';

@Module({
  // TelegramModule: reuses ReportParsingService (Claude extraction) for
  // crew-submitted reports too. StorageModule: uploads their photos the
  // same way jobs/telegram photos are stored.
  imports: [JobsModule, TelegramModule, StorageModule],
  controllers: [IncomingReportsController],
  providers: [IncomingReportsService],
})
export class IncomingReportsModule {}
