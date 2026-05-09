import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { DomainEvent } from '@det/backend-shared-ddd';

import { OutboxEventSchema } from './outbox-event.schema';

import type { EntityManager } from '@mikro-orm/postgresql';

function toSerializablePayload(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => {
      if (typeof v === 'bigint') return v.toString();
      if (v instanceof Map) return Object.fromEntries(v) as unknown;
      return v;
    }),
  ) as unknown;
}

function stableEventUuid(eventId: string): string {
  const hash = createHash('sha256').update(eventId).digest('hex');

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

@Injectable()
export class OutboxService {
  append(event: DomainEvent, em: EntityManager): Promise<void> {
    em.persist(
      em.create(OutboxEventSchema, {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        failedAt: null,
        id: stableEventUuid(event.eventId),
        lastError: null,
        occurredAt: event.occurredAt,
        payload: toSerializablePayload(event),
        publishedAt: null,
        retryAfterAt: null,
        retryCount: 0,
      }),
    );

    return Promise.resolve();
  }
}
