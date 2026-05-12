import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  IUserNotificationPreferencesRepository,
  UserNotificationPreferences,
} from '@det/backend-notifications-domain';
import { OutboxService } from '@det/backend-shared-outbox';
import type { UserId } from '@det/shared-types';

import {
  mapUserPrefsToDomain,
  mapUserPrefsToPersistence,
} from '../mappers/user-notification-preferences.mapper';
import { UserNotificationPreferencesSchema } from '../schemas/user-notification-preferences.schema';

@Injectable()
export class UserNotificationPreferencesRepositoryImpl implements IUserNotificationPreferencesRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findByUserId(userId: UserId): Promise<UserNotificationPreferences | null> {
    const schema = await this.em.findOne(UserNotificationPreferencesSchema, { userId });

    return schema ? mapUserPrefsToDomain(schema) : null;
  }

  async save(prefs: UserNotificationPreferences): Promise<void> {
    const existing = await this.em.findOne(UserNotificationPreferencesSchema, {
      userId: prefs.userId,
    });
    const persisted = mapUserPrefsToPersistence(prefs, existing);
    const events = prefs.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
