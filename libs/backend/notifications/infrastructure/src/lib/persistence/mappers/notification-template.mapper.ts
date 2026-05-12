import { NotificationTemplate } from '@det/backend-notifications-domain';
import type { NotificationChannel, TemplateCode } from '@det/backend-notifications-domain';

import { NotificationTemplateSchema } from '../schemas/notification-template.schema';

export function mapNotificationTemplateToDomain(
  s: NotificationTemplateSchema,
): NotificationTemplate {
  return NotificationTemplate.restore({
    bodyByChannel: s.bodyByChannel,
    code: s.code as TemplateCode,
    defaultChannels: s.defaultChannels as NotificationChannel[],
    isCritical: s.isCritical,
    title: s.title,
    updatedAt: s.updatedAt.toISOString(),
  });
}

export function mapNotificationTemplateToPersistence(
  domain: NotificationTemplate,
  existing: NotificationTemplateSchema | null,
): NotificationTemplateSchema {
  const s = existing ?? new NotificationTemplateSchema();
  const snap = domain.toSnapshot();

  s.code = snap.code;
  s.title = snap.title;
  s.bodyByChannel = snap.bodyByChannel;
  s.defaultChannels = [...snap.defaultChannels];
  s.isCritical = snap.isCritical;
  s.updatedAt = new Date(snap.updatedAt);

  return s;
}
