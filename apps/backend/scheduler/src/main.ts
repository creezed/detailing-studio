import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { SchedulerModule } from './scheduler.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SchedulerModule);
  const logger = new Logger('Scheduler');

  app.enableShutdownHooks();
  logger.log('Billing scheduler started');
}

void bootstrap().catch((e: unknown) => {
  const logger = new Logger('Scheduler');

  logger.error(e, 'Scheduler bootstrap failed');
  process.exit(1);
});
