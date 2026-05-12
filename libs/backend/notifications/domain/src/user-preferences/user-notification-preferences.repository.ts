import type { UserId } from '@det/shared-types';

import type { UserNotificationPreferences } from './user-notification-preferences.aggregate';

export interface IUserNotificationPreferencesRepository {
  findByUserId(userId: UserId): Promise<UserNotificationPreferences | null>;
  save(prefs: UserNotificationPreferences): Promise<void>;
}
