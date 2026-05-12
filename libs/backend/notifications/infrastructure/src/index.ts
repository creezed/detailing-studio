export { HandlebarsTemplateRenderer } from './lib/rendering/handlebars-template-renderer.adapter';
export { MjmlEmailRenderer } from './lib/rendering/mjml-email-renderer.adapter';
export type { EmailRenderResult } from './lib/rendering/mjml-email-renderer.adapter';
export { loadTemplateBodies } from './lib/rendering/template-body-loader';
export type { TemplateBodyMap } from './lib/rendering/template-body-loader';

export { SmsRuAdapter } from './lib/adapters/sms/sms-ru.adapter';
export { SmtpAdapter } from './lib/adapters/email/smtp.adapter';
export { TelegramBotAdapter } from './lib/adapters/telegram/telegram-bot.adapter';
export { TelegramBotModule } from './lib/adapters/telegram/telegram-bot.module';
export { TELEGRAF_INSTANCE } from './lib/adapters/telegram/telegram.tokens';
export { WebPushAdapter } from './lib/adapters/push/web-push.adapter';
export { FakeNotificationAdapter } from './lib/adapters/fake/fake.adapter';
export type { FakeSentNotification } from './lib/adapters/fake/fake.adapter';

export { NotificationDispatcherAdapter } from './lib/dispatcher/notification-dispatcher.adapter';

export { NotificationsInfrastructureModule } from './lib/notifications-infrastructure.module';
export { NotificationsPersistenceModule } from './lib/notifications-persistence.module';

export { NotificationSchema } from './lib/persistence/schemas/notification.schema';
export { NotificationTemplateSchema } from './lib/persistence/schemas/notification-template.schema';
export { UserNotificationPreferencesSchema } from './lib/persistence/schemas/user-notification-preferences.schema';
export { PushSubscriptionSchema } from './lib/persistence/schemas/push-subscription.schema';
export { NotificationDedupKeySchema } from './lib/persistence/schemas/notification-dedup-key.schema';

export { NotificationRepositoryImpl } from './lib/persistence/repositories/notification.repository.impl';
export { NotificationTemplateRepositoryImpl } from './lib/persistence/repositories/notification-template.repository.impl';
export { UserNotificationPreferencesRepositoryImpl } from './lib/persistence/repositories/user-notification-preferences.repository.impl';
export { PushSubscriptionRepositoryImpl } from './lib/persistence/repositories/push-subscription.repository.impl';

export { NotificationIssuedOutboxRelay } from './lib/queue/notification-issued.outbox-relay';
export { ReminderSchedulerAdapter } from './lib/queue/reminder-scheduler.adapter';
export { NotificationsQueueModule } from './lib/queue/notifications-queue.module';
export {
  NOTIFICATIONS_QUEUE,
  NOTIFICATIONS_REMINDERS_QUEUE,
} from './lib/queue/notifications-queue.constants';

export {
  up as migrationUp,
  down as migrationDown,
} from './lib/persistence/migrations/20250513-create-notifications';

export {
  SMS_SENDER,
  EMAIL_SENDER,
  TELEGRAM_SENDER,
  WEB_PUSH_SENDER,
  MJML_EMAIL_RENDERER,
} from './lib/tokens';

export type {
  ChannelSendResult,
  SendResult,
  SendError,
  ISmsSender,
  IEmailSender,
  ITelegramSender,
  IWebPushSender,
  EmailPayload,
  PushPayload,
  PushSubscriptionDto,
} from './lib/sender-ports';
