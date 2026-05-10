import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'pii_access_log' })
export class CrmPiiAccessLogSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'actor_user_id', type: 'uuid' })
  declare actorUserId: string;

  @Property({ fieldName: 'client_id', type: 'uuid' })
  declare clientId: string;

  @Property({ type: 'text' })
  declare operation: string;

  @Property({ nullable: true, type: 'jsonb' })
  declare fields: string[] | null;

  @Property({ fieldName: 'occurred_at', type: 'timestamptz' })
  declare occurredAt: Date;

  @Property({ nullable: true, type: 'text' })
  declare ip: string | null;

  @Property({ fieldName: 'user_agent', nullable: true, type: 'text' })
  declare userAgent: string | null;
}
