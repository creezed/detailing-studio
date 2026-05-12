import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  NOTIFICATION_TEMPLATE_REPOSITORY,
  PUSH_SUBSCRIPTION_REPOSITORY,
  REMINDER_SCHEDULER,
  USER_NOTIFICATION_PREFERENCES_REPOSITORY,
} from '@det/backend-notifications-application';

import { NotificationTemplateRepositoryImpl } from './persistence/repositories/notification-template.repository.impl';
import { NotificationRepositoryImpl } from './persistence/repositories/notification.repository.impl';
import { PushSubscriptionRepositoryImpl } from './persistence/repositories/push-subscription.repository.impl';
import { UserNotificationPreferencesRepositoryImpl } from './persistence/repositories/user-notification-preferences.repository.impl';
import { NotificationDedupKeySchema } from './persistence/schemas/notification-dedup-key.schema';
import { NotificationTemplateSchema } from './persistence/schemas/notification-template.schema';
import { NotificationSchema } from './persistence/schemas/notification.schema';
import { PushSubscriptionSchema } from './persistence/schemas/push-subscription.schema';
import { UserNotificationPreferencesSchema } from './persistence/schemas/user-notification-preferences.schema';
import { NotificationIssuedOutboxRelay } from './queue/notification-issued.outbox-relay';
import { NotificationsQueueModule } from './queue/notifications-queue.module';
import { ReminderSchedulerAdapter } from './queue/reminder-scheduler.adapter';

import type { DynamicModule, Provider } from '@nestjs/common';

const NOTIFICATION_SCHEMAS = [
  NotificationSchema,
  NotificationTemplateSchema,
  UserNotificationPreferencesSchema,
  PushSubscriptionSchema,
  NotificationDedupKeySchema,
];

const REPOSITORY_PROVIDERS: Provider[] = [
  NotificationRepositoryImpl,
  NotificationTemplateRepositoryImpl,
  UserNotificationPreferencesRepositoryImpl,
  PushSubscriptionRepositoryImpl,
  {
    provide: NOTIFICATION_REPOSITORY,
    useExisting: NotificationRepositoryImpl,
  },
  {
    provide: NOTIFICATION_TEMPLATE_REPOSITORY,
    useExisting: NotificationTemplateRepositoryImpl,
  },
  {
    provide: USER_NOTIFICATION_PREFERENCES_REPOSITORY,
    useExisting: UserNotificationPreferencesRepositoryImpl,
  },
  {
    provide: PUSH_SUBSCRIPTION_REPOSITORY,
    useExisting: PushSubscriptionRepositoryImpl,
  },
];

const QUEUE_PROVIDERS: Provider[] = [
  NotificationIssuedOutboxRelay,
  ReminderSchedulerAdapter,
  {
    provide: REMINDER_SCHEDULER,
    useExisting: ReminderSchedulerAdapter,
  },
];

@Module({})
export class NotificationsPersistenceModule {
  static register(): DynamicModule {
    return {
      exports: [
        NOTIFICATION_REPOSITORY,
        NOTIFICATION_TEMPLATE_REPOSITORY,
        USER_NOTIFICATION_PREFERENCES_REPOSITORY,
        PUSH_SUBSCRIPTION_REPOSITORY,
        REMINDER_SCHEDULER,
      ],
      imports: [MikroOrmModule.forFeature(NOTIFICATION_SCHEMAS), NotificationsQueueModule],
      module: NotificationsPersistenceModule,
      providers: [...REPOSITORY_PROVIDERS, ...QUEUE_PROVIDERS],
    };
  }
}
