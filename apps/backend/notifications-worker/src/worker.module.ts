import { randomUUID } from 'node:crypto';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';

import {
  CLOCK,
  ID_GENERATOR,
  IssueNotificationHandler,
  USER_CONTACT_PORT,
} from '@det/backend-notifications-application';
import type { IUserContactPort } from '@det/backend-notifications-application';
import type { RecipientRef } from '@det/backend-notifications-domain';
import {
  NotificationsInfrastructureModule,
  NotificationsPersistenceModule,
} from '@det/backend-notifications-infrastructure';
import { DateTime } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { OutboxModule } from '@det/backend-shared-outbox';

import { ExpiredCleanupCron } from './lifecycle/expired-cleanup.cron';
import { RetentionCleanupCron } from './lifecycle/retention-cleanup.cron';
import { IssueAndSendProcessor } from './processors/issue-and-send.processor';
import { SendNotificationProcessor } from './processors/send-notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        autoLoadEntities: true,
        clientUrl:
          config.get<string>('DATABASE_URL') ??
          'postgres://detailing:placeholder@127.0.0.1:5432/detailing',
        discovery: { warnWhenNoEntities: false },
        driver: PostgreSqlDriver,
        registerRequestContext: false,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          password: config.get<string>('REDIS_PASSWORD', 'placeholder'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    OutboxModule,
    NotificationsInfrastructureModule.register(),
    NotificationsPersistenceModule.register(),
  ],
  providers: [
    SendNotificationProcessor,
    IssueAndSendProcessor,
    ExpiredCleanupCron,
    RetentionCleanupCron,
    IssueNotificationHandler,
    {
      provide: CLOCK,
      useValue: { now: (): DateTime => DateTime.now() } satisfies IClock,
    },
    {
      provide: ID_GENERATOR,
      useValue: { generate: (): string => randomUUID() } satisfies IIdGenerator,
    },
    {
      provide: USER_CONTACT_PORT,
      useValue: {
        getContactRefsFor: (): Promise<RecipientRef[]> => Promise.resolve([]),
      } satisfies IUserContactPort,
    },
  ],
})
export class WorkerModule {}
