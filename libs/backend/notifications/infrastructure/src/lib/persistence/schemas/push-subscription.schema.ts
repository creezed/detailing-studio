import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'ntf_push_subscription' })
@Index({ name: 'idx_ntf_push_sub_user_id', properties: ['userId'] })
export class PushSubscriptionSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  declare userId: string;

  @Unique()
  @Property({ type: 'text' })
  declare endpoint: string;

  @Property({ type: 'text' })
  declare p256dh: string;

  @Property({ type: 'text' })
  declare auth: string;

  @Property({ fieldName: 'user_agent', nullable: true, type: 'text' })
  declare userAgent: string | null;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'expired_at', nullable: true, type: 'timestamptz' })
  declare expiredAt: Date | null;
}
