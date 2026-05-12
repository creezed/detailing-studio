import type { NotificationId } from '@det/shared-types';

export class GetNotificationByIdQuery {
  constructor(public readonly notificationId: NotificationId) {}
}
