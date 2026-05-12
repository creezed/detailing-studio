import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { NOTIFICATION_DISPATCHER, TEMPLATE_RENDERER } from '@det/backend-notifications-application';

import { SmtpAdapter } from './adapters/email/smtp.adapter';
import { FakeNotificationAdapter } from './adapters/fake/fake.adapter';
import { WebPushAdapter } from './adapters/push/web-push.adapter';
import { SmsRuAdapter } from './adapters/sms/sms-ru.adapter';
import { TelegramBotAdapter } from './adapters/telegram/telegram-bot.adapter';
import { TelegramBotModule } from './adapters/telegram/telegram-bot.module';
import { NotificationDispatcherAdapter } from './dispatcher/notification-dispatcher.adapter';
import { HandlebarsTemplateRenderer } from './rendering/handlebars-template-renderer.adapter';
import { MjmlEmailRenderer } from './rendering/mjml-email-renderer.adapter';
import {
  EMAIL_SENDER,
  MJML_EMAIL_RENDERER,
  SMS_SENDER,
  TELEGRAM_SENDER,
  WEB_PUSH_SENDER,
} from './tokens';

import type { DynamicModule, Provider } from '@nestjs/common';

@Module({})
export class NotificationsInfrastructureModule {
  static register(): DynamicModule {
    const renderingProviders: Provider[] = [
      HandlebarsTemplateRenderer,
      MjmlEmailRenderer,
      { provide: TEMPLATE_RENDERER, useExisting: HandlebarsTemplateRenderer },
      { provide: MJML_EMAIL_RENDERER, useExisting: MjmlEmailRenderer },
    ];

    const realAdapters: Provider[] = [
      SmsRuAdapter,
      SmtpAdapter,
      TelegramBotAdapter,
      WebPushAdapter,
      { provide: SMS_SENDER, useExisting: SmsRuAdapter },
      { provide: EMAIL_SENDER, useExisting: SmtpAdapter },
      { provide: TELEGRAM_SENDER, useExisting: TelegramBotAdapter },
      { provide: WEB_PUSH_SENDER, useExisting: WebPushAdapter },
    ];

    const fakeAdapter: Provider[] = [
      FakeNotificationAdapter,
      { provide: SMS_SENDER, useExisting: FakeNotificationAdapter },
      { provide: EMAIL_SENDER, useExisting: FakeNotificationAdapter },
      { provide: TELEGRAM_SENDER, useExisting: FakeNotificationAdapter },
      { provide: WEB_PUSH_SENDER, useExisting: FakeNotificationAdapter },
    ];

    const channelProviders: Provider[] = [
      {
        provide: 'CHANNEL_ADAPTERS',
        useFactory: (config: ConfigService): Provider[] => {
          const transport = config.get<string>('NOTIFICATIONS_TRANSPORT', 'real');

          return transport === 'fake' ? fakeAdapter : realAdapters;
        },
        inject: [ConfigService],
      },
    ];

    const dispatcherProvider: Provider = {
      provide: NOTIFICATION_DISPATCHER,
      useClass: NotificationDispatcherAdapter,
    };

    return {
      exports: [
        TEMPLATE_RENDERER,
        NOTIFICATION_DISPATCHER,
        SMS_SENDER,
        EMAIL_SENDER,
        TELEGRAM_SENDER,
        WEB_PUSH_SENDER,
        MJML_EMAIL_RENDERER,
      ],
      imports: [ConfigModule, TelegramBotModule.forRoot()],
      module: NotificationsInfrastructureModule,
      providers: [...renderingProviders, ...realAdapters, dispatcherProvider, ...channelProviders],
    };
  }
}
