import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

import { TelegramBotAdapter } from './telegram-bot.adapter';
import { TELEGRAF_INSTANCE } from './telegram.tokens';

import type { DynamicModule, OnApplicationShutdown } from '@nestjs/common';

@Module({})
export class TelegramBotModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramBotModule.name);

  constructor(private readonly config: ConfigService) {}

  static forRoot(): DynamicModule {
    const telegrafProvider = {
      provide: TELEGRAF_INSTANCE,
      useFactory: (config: ConfigService): Telegraf => {
        const token = config.get<string>('TELEGRAM_BOT_TOKEN', '');
        const bot = new Telegraf(token || 'placeholder');

        bot.command('start', (ctx) =>
          ctx.reply('Привет, я бот студии. Для связывания используйте deep-link из приложения.'),
        );

        // TODO: N.8 — bot.action(/confirm:(.+)/) handler for appointment confirmation

        return bot;
      },
      inject: [ConfigService],
    };

    return {
      exports: [TELEGRAF_INSTANCE, TelegramBotAdapter],
      global: true,
      module: TelegramBotModule,
      providers: [telegrafProvider, TelegramBotAdapter],
    };
  }

  onApplicationBootstrap(): void {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');

    if (!token) {
      this.logger.warn('Telegram отключен: TELEGRAM_BOT_TOKEN не задан');

      return;
    }

    // bot.launch() is intentionally NOT called here in library code.
    // It must be called from the main app bootstrap (apps/backend/api).
    this.logger.log('TelegramBotModule initialized, bot.launch() deferred to app bootstrap');
  }

  onApplicationShutdown(): void {
    // Shutdown handled by the main app
  }
}
