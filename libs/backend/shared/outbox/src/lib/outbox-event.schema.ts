import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'outbox_events' })
export class OutboxEventSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'aggregate_type', type: 'text' })
  declare aggregateType: string;

  @Property({ fieldName: 'aggregate_id', type: 'text' })
  declare aggregateId: string;

  @Property({ fieldName: 'event_type', type: 'text' })
  declare eventType: string;

  @Property({ type: 'jsonb' })
  declare payload: unknown;

  @Property({ fieldName: 'occurred_at', type: 'timestamptz' })
  declare occurredAt: Date;

  @Property({ fieldName: 'published_at', nullable: true, type: 'timestamptz' })
  declare publishedAt: Date | null;

  @Property({ type: 'int' })
  declare attempts: number;

  @Property({ fieldName: 'last_error', nullable: true, type: 'text' })
  declare lastError: string | null;
}
