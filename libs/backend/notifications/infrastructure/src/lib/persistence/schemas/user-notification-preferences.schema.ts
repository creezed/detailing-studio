import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'ntf_user_notification_preferences' })
export class UserNotificationPreferencesSchema {
  @PrimaryKey({ fieldName: 'user_id', type: 'uuid' })
  declare userId: string;

  @Property({ fieldName: 'channels_by_template', type: 'jsonb' })
  declare channelsByTemplate: Record<string, readonly string[]>;

  @Property({ fieldName: 'quiet_hours', nullable: true, type: 'jsonb' })
  declare quietHours: { startMinuteOfDay: number; endMinuteOfDay: number; timezone: string } | null;

  @Property({ fieldName: 'unsubscribed_channels', type: 'jsonb' })
  declare unsubscribedChannels: string[];

  @Property({ fieldName: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
