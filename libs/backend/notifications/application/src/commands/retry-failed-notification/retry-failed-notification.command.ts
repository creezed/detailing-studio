import type { DateTime } from '@det/backend-shared-ddd';
import type { NotificationId, UserId } from '@det/shared-types';

export class RetryFailedNotificationCommand {
  constructor(
    public readonly notificationId: NotificationId,
    public readonly by: UserId,
    public readonly now: DateTime,
  ) {}
}
