import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  IPushSubscriptionRepository,
  PushSubscriptionRecord,
} from '@det/backend-notifications-application';
import type { UserId } from '@det/shared-types';

import { PushSubscriptionSchema } from '../schemas/push-subscription.schema';

function toRecord(s: PushSubscriptionSchema): PushSubscriptionRecord {
  return {
    createdAt: s.createdAt.toISOString(),
    endpoint: s.endpoint,
    id: s.id,
    keys: { auth: s.auth, p256dh: s.p256dh },
    userAgent: s.userAgent,
    userId: s.userId as UserId,
  };
}

@Injectable()
export class PushSubscriptionRepositoryImpl implements IPushSubscriptionRepository {
  constructor(private readonly em: EntityManager) {}

  async findByEndpoint(endpoint: string): Promise<PushSubscriptionRecord | null> {
    const schema = await this.em.findOne(PushSubscriptionSchema, { endpoint, expiredAt: null });

    return schema ? toRecord(schema) : null;
  }

  async save(record: PushSubscriptionRecord): Promise<void> {
    const existing = await this.em.findOne(PushSubscriptionSchema, { id: record.id });
    const s = existing ?? new PushSubscriptionSchema();

    s.id = record.id;
    s.userId = record.userId;
    s.endpoint = record.endpoint;
    s.p256dh = record.keys.p256dh;
    s.auth = record.keys.auth;
    s.userAgent = record.userAgent;
    s.createdAt = new Date(record.createdAt);
    s.expiredAt = null;

    await this.em.persist(s).flush();
  }

  async deleteById(id: string, userId: UserId): Promise<boolean> {
    const schema = await this.em.findOne(PushSubscriptionSchema, { id, userId });

    if (!schema) {
      return false;
    }

    schema.expiredAt = new Date();
    await this.em.flush();

    return true;
  }
}
