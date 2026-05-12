import { Module } from '@nestjs/common';

import { AdminNotificationsController } from './http/admin-notifications.controller';
import { MyNotificationsController } from './http/my-notifications.controller';
import { PushSubscriptionsController } from './http/push-subscriptions.controller';
import { UnsubscribeController } from './http/unsubscribe.controller';

@Module({
  controllers: [
    MyNotificationsController,
    PushSubscriptionsController,
    UnsubscribeController,
    AdminNotificationsController,
  ],
})
export class NotificationsHttpModule {}
