import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'ntf_notification_template' })
export class NotificationTemplateSchema {
  @PrimaryKey({ type: 'text' })
  declare code: string;

  @Property({ type: 'text' })
  declare title: string;

  @Property({ fieldName: 'body_by_channel', type: 'jsonb' })
  declare bodyByChannel: Record<string, string | null>;

  @Property({ fieldName: 'default_channels', type: 'jsonb' })
  declare defaultChannels: string[];

  @Property({ fieldName: 'is_critical', type: 'boolean' })
  declare isCritical: boolean;

  @Property({ fieldName: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
