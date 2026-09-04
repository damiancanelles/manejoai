import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramWebhookGuard } from './telegram-webhook.guard';
import { ReportParsingService } from './report-parsing.service';

@Module({
  imports: [StorageModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramWebhookGuard, ReportParsingService],
})
export class TelegramModule {}
