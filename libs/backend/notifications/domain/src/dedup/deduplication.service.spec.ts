import { DateTime } from '@det/backend-shared-ddd';
import { NotificationId } from '@det/shared-types';

import { DeduplicationService } from './deduplication.service';
import { Notification } from '../notification/notification.aggregate';
import { NotificationChannel } from '../value-objects/notification-channel';
import { TemplatePayload } from '../value-objects/template-payload';

const NOW = DateTime.from('2024-06-15T12:00:00Z');

function makeNotification(
  templateCode: string,
  createdAt: DateTime,
  status: 'PENDING' | 'SENT' | 'FAILED' = 'PENDING',
): Notification {
  const n = Notification.issue({
    id: NotificationId.from('00000000-0000-1000-8000-000000000099'),
    recipient: { kind: 'user', userId: 'u-1' as never },
    templateCode: templateCode as never,
    channel: NotificationChannel.EMAIL,
    payload: TemplatePayload.from({}),
    scheduledFor: null,
    dedupKey: null,
    now: createdAt,
  });

  if (status === 'SENT') {
    n.enqueue(createdAt);
    n.markSending();
    n.markSent('prov', createdAt);
  } else if (status === 'FAILED') {
    n.enqueue(createdAt);
    n.markSending();
    n.markFailed('err', createdAt);
  }

  n.pullDomainEvents();
  return n;
}

describe('DeduplicationService', () => {
  const svc = new DeduplicationService();

  describe('computeDedupKey', () => {
    it('returns key for LOW_STOCK with skuId + branchId', () => {
      const payload = TemplatePayload.from({
        skuId: 'sku-1',
        branchId: 'branch-1',
      });

      const key = svc.computeDedupKey('LOW_STOCK', payload, NOW);

      expect(key).not.toBeNull();
      expect(key?.scopeKey).toBe('low-stock:sku-1:branch-1');
      expect(key?.templateCode).toBe('LOW_STOCK');
    });

    it('returns key for APPOINTMENT_REMINDER with appointmentId + offset', () => {
      const payload = TemplatePayload.from({
        appointmentId: 'appt-1',
        offset: '24h',
      });

      const key = svc.computeDedupKey('APPOINTMENT_REMINDER', payload, NOW);

      expect(key).not.toBeNull();
      expect(key?.scopeKey).toBe('appt-reminder:appt-1:24h');
    });

    it('returns null for APPOINTMENT_CONFIRMED (non-dedup template)', () => {
      const payload = TemplatePayload.from({ name: 'Test' });

      const key = svc.computeDedupKey('APPOINTMENT_CONFIRMED', payload, NOW);

      expect(key).toBeNull();
    });

    it('returns null for LOW_STOCK with missing payload fields', () => {
      const payload = TemplatePayload.from({});

      const key = svc.computeDedupKey('LOW_STOCK', payload, NOW);

      expect(key).toBeNull();
    });
  });

  describe('shouldSuppress', () => {
    it('returns false when dedupKey is null', () => {
      const result = svc.shouldSuppress(null, []);

      expect(result).toBe(false);
    });

    it('returns true when recent PENDING notification exists with same key', () => {
      const dedupKey = svc.computeDedupKey(
        'LOW_STOCK',
        TemplatePayload.from({ skuId: 'sku-1', branchId: 'branch-1' }),
        NOW,
      );

      const recent = makeNotification('LOW_STOCK', NOW, 'PENDING');

      expect(svc.shouldSuppress(dedupKey, [recent])).toBe(true);
    });

    it('returns true when recent SENT notification exists', () => {
      const dedupKey = svc.computeDedupKey(
        'LOW_STOCK',
        TemplatePayload.from({ skuId: 'sku-1', branchId: 'branch-1' }),
        NOW,
      );

      const recent = makeNotification('LOW_STOCK', NOW, 'SENT');

      expect(svc.shouldSuppress(dedupKey, [recent])).toBe(true);
    });

    it('returns false when recent notification is FAILED', () => {
      const dedupKey = svc.computeDedupKey(
        'LOW_STOCK',
        TemplatePayload.from({ skuId: 'sku-1', branchId: 'branch-1' }),
        NOW,
      );

      const recent = makeNotification('LOW_STOCK', NOW, 'FAILED');

      expect(svc.shouldSuppress(dedupKey, [recent])).toBe(false);
    });

    it('returns false when no recent notifications', () => {
      const dedupKey = svc.computeDedupKey(
        'LOW_STOCK',
        TemplatePayload.from({ skuId: 'sku-1', branchId: 'branch-1' }),
        NOW,
      );

      expect(svc.shouldSuppress(dedupKey, [])).toBe(false);
    });

    it('APPOINTMENT_CONFIRMED always returns false (null dedupKey)', () => {
      const dedupKey = svc.computeDedupKey('APPOINTMENT_CONFIRMED', TemplatePayload.from({}), NOW);

      const recent = makeNotification('APPOINTMENT_CONFIRMED', NOW, 'SENT');

      expect(svc.shouldSuppress(dedupKey, [recent])).toBe(false);
    });
  });
});
