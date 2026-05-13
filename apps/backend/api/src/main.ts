import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';

import { TELEGRAF_INSTANCE } from '@det/backend-notifications-infrastructure';

import { AppModule } from './app/app.module';

import type { Telegraf } from 'telegraf';

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : fallback;
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';

  await app.register(fastifyHelmet);
  await app.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new I18nValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new I18nValidationExceptionFilter({ detailedErrors: true }));

  const allowedOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:4200');

  app.enableCors({
    credentials: true,
    origin: allowedOrigins.split(',').map((o) => o.trim()),
  });

  if (configService.get<string>('NODE_ENV', 'development') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Detailing Studio API')
      .setDescription('Detailing Studio backend API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  }

  const port = parsePort(configService.get<string>('API_PORT'), 3000);

  await app.listen(port, '0.0.0.0');

  const telegramToken = configService.get<string>('TELEGRAM_BOT_TOKEN', '');
  const logger = new Logger('TelegramBotLauncher');

  if (telegramToken) {
    const bot = app.get<Telegraf>(TELEGRAF_INSTANCE);

    void bot.launch().then(() => {
      logger.log('Telegram bot started');
    });

    const stop = (): void => {
      bot.stop('SIGTERM');
    };

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  } else {
    logger.warn('Telegram отключен: TELEGRAM_BOT_TOKEN не задан');
  }
}

void bootstrap();
