import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { JobsModule } from '../jobs/jobs.module';
import { AccountsModule } from '../accounts/accounts.module';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [InvoicesModule, JobsModule, AccountsModule, QuotesModule],
  providers: [AssistantService],
  controllers: [AssistantController],
})
export class AssistantModule {}
