import type { NotificationChannel } from '@det/backend-notifications-domain';
import type { DateTime } from '@det/backend-shared-ddd';

export class GlobalUnsubscribeCommand {
  constructor(
    public readonly unsubscribeToken: string,
    public readonly channel: NotificationChannel,
    public readonly now: DateTime,
  ) {}
}
