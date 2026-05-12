import { DateTime } from '@det/backend-shared-ddd';

import { NotificationStatus } from '../notification/notification-status';

import type { DedupKey } from '../notification/dedup-key';
import type { Notification } from '../notification/notification.aggregate';
import type { TemplateCode } from '../value-objects/template-code';
import type { TemplatePayload } from '../value-objects/template-payload';

const ACTIVE_STATUSES: ReadonlySet<NotificationStatus> = new Set([
  NotificationStatus.PENDING,
  NotificationStatus.QUEUED,
  NotificationStatus.SENDING,
  NotificationStatus.SENT,
]);

const LOW_STOCK_WINDOW_HOURS = 24;
const APPOINTMENT_REMINDER_WINDOW_HOURS = 2;

export class DeduplicationService {
  shouldSuppress(dedupKey: DedupKey | null, recentByKey: readonly Notification[]): boolean {
    if (dedupKey === null) {
      return false;
    }

    return recentByKey.some((n) => ACTIVE_STATUSES.has(n.status));
  }

  computeDedupKey(
    templateCode: TemplateCode,
    payload: TemplatePayload,
    now: DateTime,
  ): DedupKey | null {
    if (templateCode === 'LOW_STOCK') {
      const skuId = payload['skuId'];
      const branchId = payload['branchId'];

      if (typeof skuId !== 'string' || typeof branchId !== 'string') {
        return null;
      }

      return {
        templateCode,
        scopeKey: `low-stock:${skuId}:${branchId}`,
        windowEndsAt: DateTime.from(
          now.toDate().getTime() + LOW_STOCK_WINDOW_HOURS * 60 * 60 * 1000,
        ),
      };
    }

    if (templateCode === 'APPOINTMENT_REMINDER') {
      const appointmentId = payload['appointmentId'];
      const offset = payload['offset'];

      if (typeof appointmentId !== 'string' || typeof offset !== 'string') {
        return null;
      }

      return {
        templateCode,
        scopeKey: `appt-reminder:${appointmentId}:${offset}`,
        windowEndsAt: DateTime.from(
          now.toDate().getTime() + APPOINTMENT_REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
        ),
      };
    }

    return null;
  }
}
