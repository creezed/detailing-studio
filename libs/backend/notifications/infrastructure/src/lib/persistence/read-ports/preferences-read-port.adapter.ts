import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  IPreferencesReadPort,
  UserNotificationPreferencesDto,
} from '@det/backend-notifications-application';
import type { UserId } from '@det/shared-types';

import { UserNotificationPreferencesSchema } from '../schemas/user-notification-preferences.schema';

@Injectable()
export class PreferencesReadPortAdapter implements IPreferencesReadPort {
  constructor(private readonly em: EntityManager) {}

  async getByUserId(userId: UserId): Promise<UserNotificationPreferencesDto | null> {
    const row = await this.em.findOne(UserNotificationPreferencesSchema, { userId });

    if (!row) {
      return null;
    }

    return {
      channelsByTemplate: row.channelsByTemplate,
      quietHours: row.quietHours,
      unsubscribedChannels: row.unsubscribedChannels,
    };
  }
}
