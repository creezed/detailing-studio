import type { UserId } from '@det/shared-types';

import type { UserNotificationPreferencesDto } from '../read-models/notification.read-models';

export const PREFERENCES_READ_PORT = Symbol('PREFERENCES_READ_PORT');

export interface IPreferencesReadPort {
  getByUserId(userId: UserId): Promise<UserNotificationPreferencesDto | null>;
}
