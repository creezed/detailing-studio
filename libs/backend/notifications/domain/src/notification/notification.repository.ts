import type { DateTime } from '@det/backend-shared-ddd';
import type { NotificationId } from '@det/shared-types';

import type { Notification } from './notification.aggregate';

export interface INotificationRepository {
  findById(id: NotificationId): Promise<Notification | null>;
  findByDedupKey(scopeKey: string, since: DateTime): Promise<Notification[]>;
  findScheduledBefore(t: DateTime, limit: number): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
}
