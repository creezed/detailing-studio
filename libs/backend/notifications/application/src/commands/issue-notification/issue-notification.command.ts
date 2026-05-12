import type {
  NotificationChannel,
  RecipientRef,
  TemplateCode,
  TemplatePayload,
} from '@det/backend-notifications-domain';
import type { DateTime } from '@det/backend-shared-ddd';

export class IssueNotificationCommand {
  constructor(
    public readonly recipient: RecipientRef,
    public readonly templateCode: TemplateCode,
    public readonly payload: TemplatePayload,
    public readonly scheduledFor: DateTime | null = null,
    public readonly requestedChannels: readonly NotificationChannel[] | null = null,
  ) {}
}
