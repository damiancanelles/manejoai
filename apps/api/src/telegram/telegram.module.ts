import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramSetupService } from './telegram-setup.service';
import { TelegramWebhookGuard } from './telegram-webhook.guard';
import { ReportParsingService } from './report-parsing.service';

@Module({
  imports: [StorageModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramSetupService, TelegramWebhookGuard, ReportParsingService],
})
export class TelegramModule {}
