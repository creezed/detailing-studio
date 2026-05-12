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
