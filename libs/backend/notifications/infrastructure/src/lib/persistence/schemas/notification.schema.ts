import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'ntf_notification' })
@Index({ name: 'idx_ntf_notification_status_scheduled', properties: ['status', 'scheduledFor'] })
@Index({
  name: 'idx_ntf_notification_recipient_created',
  properties: ['recipientUserId', 'createdAt'],
})
@Index({ name: 'idx_ntf_notification_dedup_created', properties: ['dedupScopeKey', 'createdAt'] })
export class NotificationSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ fieldName: 'recipient_kind', type: 'text' })
  declare recipientKind: string;

  @Property({ fieldName: 'recipient_user_id', nullable: true, type: 'uuid' })
  declare recipientUserId: string | null;

  @Property({ fieldName: 'recipient_phone', nullable: true, type: 'text' })
  declare recipientPhone: string | null;

  @Property({ fieldName: 'recipient_email', nullable: true, type: 'text' })
  declare recipientEmail: string | null;

  @Property({ fieldName: 'recipient_chat_id', nullable: true, type: 'text' })
  declare recipientChatId: string | null;

  @Property({ fieldName: 'template_code', type: 'text' })
  declare templateCode: string;

  @Property({ type: 'text' })
  declare channel: string;

  @Property({ type: 'jsonb' })
  declare payload: Record<string, unknown>;

  @Property({ type: 'text' })
  declare status: string;

  @Property({ type: 'jsonb' })
  declare attempts: unknown[];

  @Property({ fieldName: 'scheduled_for', nullable: true, type: 'timestamptz' })
  declare scheduledFor: Date | null;

  @Property({ fieldName: 'dedup_scope_key', nullable: true, type: 'text' })
  declare dedupScopeKey: string | null;

  @Property({ fieldName: 'dedup_template_code', nullable: true, type: 'text' })
  declare dedupTemplateCode: string | null;

  @Property({ fieldName: 'dedup_window_ends_at', nullable: true, type: 'timestamptz' })
  declare dedupWindowEndsAt: Date | null;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'sent_at', nullable: true, type: 'timestamptz' })
  declare sentAt: Date | null;

  @Property({ fieldName: 'failed_at', nullable: true, type: 'timestamptz' })
  declare failedAt: Date | null;

  @Property({ fieldName: 'expires_at', type: 'timestamptz' })
  declare expiresAt: Date;

  @Property({ fieldName: 'last_error', nullable: true, type: 'text' })
  declare lastError: string | null;
}
