import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { DeletePushSubscriptionHandler } from './commands/delete-push-subscription/delete-push-subscription.handler';
import { GlobalUnsubscribeHandler } from './commands/global-unsubscribe/global-unsubscribe.handler';
import { IssueNotificationHandler } from './commands/issue-notification/issue-notification.handler';
import { RetryFailedNotificationHandler } from './commands/retry-failed-notification/retry-failed-notification.handler';
import { SavePushSubscriptionHandler } from './commands/save-push-subscription/save-push-subscription.handler';
import { UpdateMyPreferencesHandler } from './commands/update-preferences/update-preferences.handler';
import { AppointmentCancelledHandler } from './event-handlers/appointment-cancelled.event-handler';
import { AppointmentConfirmedHandler } from './event-handlers/appointment-confirmed.event-handler';
import { AppointmentRescheduledHandler } from './event-handlers/appointment-rescheduled.event-handler';
import { CancellationRequestCreatedHandler } from './event-handlers/cancellation-request-created.event-handler';
import { InvitationIssuedHandler } from './event-handlers/invitation-issued.event-handler';
import { LowStockReachedHandler } from './event-handlers/low-stock-reached.event-handler';
import { UserRegisteredHandler } from './event-handlers/user-registered.event-handler';
import { WorkOrderClosedHandler } from './event-handlers/work-order-closed.event-handler';
import { GetMyPreferencesHandler } from './queries/get-my-preferences/get-my-preferences.handler';
import { GetNotificationByIdHandler } from './queries/get-notification-by-id/get-notification-by-id.handler';
import { ListFailedNotificationsHandler } from './queries/list-failed-notifications/list-failed-notifications.handler';
import { ListMyNotificationsHandler } from './queries/list-my-notifications/list-my-notifications.handler';
import { ListNotificationsAdminHandler } from './queries/list-notifications-admin/list-notifications-admin.handler';

import type { DynamicModule, ModuleMetadata, Provider } from '@nestjs/common';

const COMMAND_HANDLERS = [
  DeletePushSubscriptionHandler,
  GlobalUnsubscribeHandler,
  IssueNotificationHandler,
  RetryFailedNotificationHandler,
  SavePushSubscriptionHandler,
  UpdateMyPreferencesHandler,
];

const QUERY_HANDLERS = [
  GetMyPreferencesHandler,
  GetNotificationByIdHandler,
  ListFailedNotificationsHandler,
  ListMyNotificationsHandler,
  ListNotificationsAdminHandler,
];

const EVENT_HANDLERS = [
  AppointmentCancelledHandler,
  AppointmentConfirmedHandler,
  AppointmentRescheduledHandler,
  CancellationRequestCreatedHandler,
  InvitationIssuedHandler,
  LowStockReachedHandler,
  UserRegisteredHandler,
  WorkOrderClosedHandler,
];

@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class NotificationsApplicationModule {
  static register(
    providers: readonly Provider[],
    imports: NonNullable<ModuleMetadata['imports']> = [],
  ): DynamicModule {
    return {
      exports: [CqrsModule, ...providers],
      global: true,
      imports: [CqrsModule, ...imports],
      module: NotificationsApplicationModule,
      providers: [...providers, ...COMMAND_HANDLERS, ...QUERY_HANDLERS, ...EVENT_HANDLERS],
    };
  }
}
