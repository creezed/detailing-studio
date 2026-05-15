import { randomUUID } from 'node:crypto';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';

import { CLOCK, ID_GENERATOR, TENANT_CONTEXT } from '@det/backend-billing-application';
import { BillingInfrastructureModule } from '@det/backend-billing-infrastructure';
import { DateTime } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { OutboxModule } from '@det/backend-shared-outbox';

import { CatchUpInvoicesCron } from './lib/catch-up-invoices.cron';
import { MonthlyInvoiceProcessor } from './lib/monthly-invoice.processor';
import { BILLING_SCHEDULER_QUEUE, MonthlyInvoiceScheduler } from './lib/monthly-invoice.scheduler';
import { RetentionCron } from './lib/retention.cron';
import { TenantContextAdapter } from './lib/tenant-context.adapter';

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
    BullModule.registerQueue({ name: BILLING_SCHEDULER_QUEUE }),
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    OutboxModule.register({ enabled: true }),
    BillingInfrastructureModule,
  ],
  providers: [
    MonthlyInvoiceScheduler,
    MonthlyInvoiceProcessor,
    CatchUpInvoicesCron,
    RetentionCron,
    TenantContextAdapter,
    { provide: TENANT_CONTEXT, useExisting: TenantContextAdapter },
    {
      provide: CLOCK,
      useValue: { now: (): DateTime => DateTime.now() } satisfies IClock,
    },
    {
      provide: ID_GENERATOR,
      useValue: { generate: (): string => randomUUID() } satisfies IIdGenerator,
    },
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SchedulerModule {}
