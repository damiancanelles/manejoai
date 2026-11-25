import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MailModule } from '../mail/mail.module';
import { AlertsService } from './alerts.service';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ClientErrorsController } from './client-errors.controller';

// Global so any service (e.g. RemindersService's cron jobs) can inject
// AlertsService without each module importing this one.
@Global()
@Module({
  imports: [MailModule],
  providers: [AlertsService, { provide: APP_FILTER, useClass: AllExceptionsFilter }],
  controllers: [ClientErrorsController],
  exports: [AlertsService],
})
export class MonitoringModule {}
