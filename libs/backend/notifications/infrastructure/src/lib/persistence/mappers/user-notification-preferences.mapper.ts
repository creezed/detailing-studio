import { UserNotificationPreferences } from '@det/backend-notifications-domain';
import type { QuietHoursProps } from '@det/backend-notifications-domain';

import { UserNotificationPreferencesSchema } from '../schemas/user-notification-preferences.schema';

export function mapUserPrefsToDomain(
  s: UserNotificationPreferencesSchema,
): UserNotificationPreferences {
  return UserNotificationPreferences.restore({
    channelsByTemplate: s.channelsByTemplate,
    quietHours: s.quietHours as QuietHoursProps | null,
    unsubscribedChannels: s.unsubscribedChannels,
    updatedAt: s.updatedAt.toISOString(),
    userId: s.userId,
  });
}

export function mapUserPrefsToPersistence(
  domain: UserNotificationPreferences,
  existing: UserNotificationPreferencesSchema | null,
): UserNotificationPreferencesSchema {
  const s = existing ?? new UserNotificationPreferencesSchema();
  const snap = domain.toSnapshot();

  s.userId = snap.userId;
  s.channelsByTemplate = snap.channelsByTemplate;
  s.quietHours = snap.quietHours
    ? {
        endMinuteOfDay: snap.quietHours.endMinuteOfDay,
        startMinuteOfDay: snap.quietHours.startMinuteOfDay,
        timezone: snap.quietHours.timezone,
      }
    : null;
  s.unsubscribedChannels = [...snap.unsubscribedChannels];
  s.updatedAt = new Date(snap.updatedAt);

  return s;
}
