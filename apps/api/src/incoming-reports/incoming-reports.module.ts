import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { IncomingReportsController } from './incoming-reports.controller';
import { IncomingReportsService } from './incoming-reports.service';

@Module({
  imports: [JobsModule],
  controllers: [IncomingReportsController],
  providers: [IncomingReportsService],
})
export class IncomingReportsModule {}
