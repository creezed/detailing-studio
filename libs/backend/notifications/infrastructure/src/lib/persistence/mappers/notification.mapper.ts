import { Notification } from '@det/backend-notifications-domain';
import type {
  NotificationSnapshot,
  RecipientRef,
  TelegramChatId,
  DeliveryAttemptSnapshot,
} from '@det/backend-notifications-domain';
import type { UserId } from '@det/shared-types';

import { NotificationSchema } from '../schemas/notification.schema';

function buildRecipient(s: NotificationSchema): RecipientRef {
  switch (s.recipientKind) {
    case 'user':
      return { kind: 'user', userId: s.recipientUserId as UserId };
    case 'phone':
      return { kind: 'phone', phone: s.recipientPhone ?? '' };
    case 'email':
      return { kind: 'email', email: s.recipientEmail ?? '' };
    case 'telegramChat':
      return { kind: 'telegramChat', chatId: (s.recipientChatId ?? '') as TelegramChatId };
    default:
      return { kind: 'phone', phone: '' };
  }
}

export function mapNotificationToDomain(s: NotificationSchema): Notification {
  const snapshot: NotificationSnapshot = {
    attempts: s.attempts as DeliveryAttemptSnapshot[],
    channel: s.channel,
    createdAt: s.createdAt.toISOString(),
    dedupKey:
      s.dedupScopeKey !== null
        ? {
            scopeKey: s.dedupScopeKey,
            templateCode: s.dedupTemplateCode ?? s.templateCode,
            windowEndsAt: s.dedupWindowEndsAt?.toISOString() ?? s.createdAt.toISOString(),
          }
        : null,
    expiresAt: s.expiresAt.toISOString(),
    failedAt: s.failedAt?.toISOString() ?? null,
    id: s.id,
    payload: s.payload as Record<string, string | number | boolean | null>,
    recipient: buildRecipient(s),
    scheduledFor: s.scheduledFor?.toISOString() ?? null,
    sentAt: s.sentAt?.toISOString() ?? null,
    status: s.status,
    templateCode: s.templateCode,
  };

  return Notification.restore(snapshot);
}

export function mapNotificationToPersistence(
  domain: Notification,
  existing: NotificationSchema | null,
): NotificationSchema {
  const s = existing ?? new NotificationSchema();
  const snap = domain.toSnapshot();

  s.id = snap.id;
  s.templateCode = snap.templateCode;
  s.channel = snap.channel;
  s.payload = snap.payload;
  s.status = snap.status;
  s.attempts = snap.attempts as unknown[];
  s.scheduledFor = snap.scheduledFor !== null ? new Date(snap.scheduledFor) : null;
  s.createdAt = new Date(snap.createdAt);
  s.sentAt = snap.sentAt !== null ? new Date(snap.sentAt) : null;
  s.failedAt = snap.failedAt !== null ? new Date(snap.failedAt) : null;
  s.expiresAt = new Date(snap.expiresAt);
  s.lastError =
    snap.attempts.length > 0 ? (snap.attempts[snap.attempts.length - 1]?.error ?? null) : null;

  s.recipientKind = snap.recipient.kind;
  s.recipientUserId = snap.recipient.kind === 'user' ? snap.recipient.userId : null;
  s.recipientPhone = snap.recipient.kind === 'phone' ? snap.recipient.phone : null;
  s.recipientEmail = snap.recipient.kind === 'email' ? snap.recipient.email : null;
  s.recipientChatId = snap.recipient.kind === 'telegramChat' ? snap.recipient.chatId : null;

  if (snap.dedupKey !== null) {
    s.dedupScopeKey = snap.dedupKey.scopeKey;
    s.dedupTemplateCode = snap.dedupKey.templateCode;
    s.dedupWindowEndsAt = new Date(snap.dedupKey.windowEndsAt);
  } else {
    s.dedupScopeKey = null;
    s.dedupTemplateCode = null;
    s.dedupWindowEndsAt = null;
  }

  return s;
}
