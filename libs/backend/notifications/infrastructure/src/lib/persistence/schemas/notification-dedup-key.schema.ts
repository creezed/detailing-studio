import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'ntf_notification_dedup_key' })
export class NotificationDedupKeySchema {
  @PrimaryKey({ fieldName: 'scope_key', type: 'text' })
  declare scopeKey: string;

  @Property({ fieldName: 'template_code', type: 'text' })
  declare templateCode: string;

  @Property({ fieldName: 'last_issued_at', type: 'timestamptz' })
  declare lastIssuedAt: Date;

  @Property({ fieldName: 'window_ends_at', type: 'timestamptz' })
  declare windowEndsAt: Date;
}
