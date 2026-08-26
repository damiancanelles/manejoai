import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { PropertiesModule } from './properties/properties.module';
import { ContactsModule } from './contacts/contacts.module';
import { JobsModule } from './jobs/jobs.module';
import { InvoicesModule } from './invoices/invoices.module';
import { RemindersModule } from './reminders/reminders.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Serves uploaded job photos at /uploads/* when STORAGE_DRIVER=local
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    StorageModule,
    MailModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    PropertiesModule,
    ContactsModule,
    JobsModule,
    InvoicesModule,
    RemindersModule,
  ],
})
export class AppModule {}
