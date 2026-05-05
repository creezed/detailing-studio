import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { DomainEvent } from '@det/backend/shared/ddd';

import { OutboxEventSchema } from './outbox-event.schema';

import type { EntityManager } from '@mikro-orm/postgresql';

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
        payload: event,
        publishedAt: null,
        retryAfterAt: null,
        retryCount: 0,
      }),
    );

    return Promise.resolve();
  }
}
