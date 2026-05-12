import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import {
  NOTIFICATIONS_QUEUE,
  NOTIFICATIONS_REMINDERS_QUEUE,
} from './notifications-queue.constants';

@Module({
  exports: [BullModule],
  imports: [
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    BullModule.registerQueue({ name: NOTIFICATIONS_REMINDERS_QUEUE }),
  ],
})
export class NotificationsQueueModule {}
