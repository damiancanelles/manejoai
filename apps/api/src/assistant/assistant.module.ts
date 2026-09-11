import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { JobsModule } from '../jobs/jobs.module';
import { AccountsModule } from '../accounts/accounts.module';
import { QuotesModule } from '../quotes/quotes.module';
import { PropertiesModule } from '../properties/properties.module';
import { ContactsModule } from '../contacts/contacts.module';
import { PaymentsModule } from '../payments/payments.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [
    InvoicesModule,
    JobsModule,
    AccountsModule,
    QuotesModule,
    PropertiesModule,
    ContactsModule,
    PaymentsModule,
    RemindersModule,
  ],
  providers: [AssistantService],
  controllers: [AssistantController],
})
export class AssistantModule {}
