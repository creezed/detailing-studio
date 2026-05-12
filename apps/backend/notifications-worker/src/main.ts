import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const logger = new Logger('NotificationsWorker');

  app.enableShutdownHooks();
  logger.log('Notifications worker started');
}

void bootstrap();
