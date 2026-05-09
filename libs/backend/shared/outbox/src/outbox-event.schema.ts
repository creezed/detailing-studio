import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'outbox_events' })
export class OutboxEventSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'aggregate_type', type: 'text' })
  declare aggregateType: string;

  @Property({ fieldName: 'aggregate_id', type: 'uuid' })
  declare aggregateId: string;

  @Property({ fieldName: 'event_type', type: 'text' })
  declare eventType: string;

  @Property({ type: 'jsonb' })
  declare payload: unknown;

  @Property({ fieldName: 'occurred_at', type: 'timestamptz' })
  declare occurredAt: Date;

  @Property({ fieldName: 'published_at', nullable: true, type: 'timestamptz' })
  declare publishedAt: Date | null;

  @Property({ fieldName: 'retry_count', type: 'int' })
  declare retryCount: number;

  @Property({ fieldName: 'retry_after_at', nullable: true, type: 'timestamptz' })
  declare retryAfterAt: Date | null;

  @Property({ fieldName: 'failed_at', nullable: true, type: 'timestamptz' })
  declare failedAt: Date | null;

  @Property({ fieldName: 'last_error', nullable: true, type: 'text' })
  declare lastError: string | null;
}
