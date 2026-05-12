import { EntityManager, QueryOrder } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { INotificationRepository, Notification } from '@det/backend-notifications-domain';
import type { DateTime } from '@det/backend-shared-ddd';
import { OutboxService } from '@det/backend-shared-outbox';
import type { NotificationId } from '@det/shared-types';

import {
  mapNotificationToDomain,
  mapNotificationToPersistence,
} from '../mappers/notification.mapper';
import { NotificationSchema } from '../schemas/notification.schema';

@Injectable()
export class NotificationRepositoryImpl implements INotificationRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: NotificationId): Promise<Notification | null> {
    const schema = await this.em.findOne(NotificationSchema, { id });

    return schema ? mapNotificationToDomain(schema) : null;
  }

  async findByDedupKey(scopeKey: string, since: DateTime): Promise<Notification[]> {
    const schemas = await this.em.find(
      NotificationSchema,
      {
        createdAt: { $gte: since.toDate() },
        dedupScopeKey: scopeKey,
      },
      { orderBy: { createdAt: QueryOrder.DESC } },
    );

    return schemas.map(mapNotificationToDomain);
  }

  async findScheduledBefore(t: DateTime, limit: number): Promise<Notification[]> {
    const schemas = await this.em.find(
      NotificationSchema,
      {
        scheduledFor: { $lte: t.toDate() },
        status: 'PENDING',
      },
      {
        limit,
        orderBy: { scheduledFor: QueryOrder.ASC },
      },
    );

    return schemas.map(mapNotificationToDomain);
  }

  async save(notification: Notification): Promise<void> {
    const existing = await this.em.findOne(NotificationSchema, { id: notification.id });
    const persisted = mapNotificationToPersistence(notification, existing);
    const events = notification.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
