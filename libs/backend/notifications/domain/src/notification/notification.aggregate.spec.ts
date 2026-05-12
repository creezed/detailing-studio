import { DateTime } from '@det/backend-shared-ddd';
import { NotificationId } from '@det/shared-types';

import { NotificationStatus } from './notification-status';
import { Notification } from './notification.aggregate';
import { InvalidStateTransitionError, MaxAttemptsReachedError } from './notification.errors';
import {
  NotificationDeduped,
  NotificationDelivered,
  NotificationExpired,
  NotificationFailed,
  NotificationIssued,
  NotificationQueued,
  NotificationRetryScheduled,
} from './notification.events';
import { NotificationChannel } from '../value-objects/notification-channel';
import { TemplatePayload } from '../value-objects/template-payload';

const ID = NotificationId.from('00000000-0000-1000-8000-000000000001');
const NOW = DateTime.from('2024-06-15T12:00:00Z');
const LATER = DateTime.from('2024-06-15T13:00:00Z');

function issueProps(overrides: Partial<Parameters<typeof Notification.issue>[0]> = {}) {
  return {
    id: ID,
    recipient: { kind: 'user' as const, userId: 'user-1' as never },
    templateCode: 'APPOINTMENT_CONFIRMED' as const,
    channel: NotificationChannel.EMAIL,
    payload: TemplatePayload.from({ name: 'Test' }),
    scheduledFor: null,
    dedupKey: null,
    now: NOW,
    ...overrides,
  };
}

describe('Notification aggregate', () => {
  describe('issue', () => {
    it('creates in PENDING status', () => {
      const n = Notification.issue(issueProps());

      expect(n.id).toBe(ID);
      expect(n.status).toBe(NotificationStatus.PENDING);
    });

    it('emits NotificationIssued event', () => {
      const n = Notification.issue(issueProps());
      const events = n.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationIssued);
    });

    it('sets expiresAt = now + ttlHours', () => {
      const n = Notification.issue(issueProps({ ttlHours: 2 }));
      const snapshot = n.toSnapshot();

      expect(snapshot.expiresAt).toBe(DateTime.from('2024-06-15T14:00:00.000Z').iso());
    });
  });

  describe('enqueue (PENDING → QUEUED)', () => {
    it('transitions to QUEUED', () => {
      const n = Notification.issue(issueProps());
      n.pullDomainEvents();

      n.enqueue(LATER);

      expect(n.status).toBe(NotificationStatus.QUEUED);
      const events = n.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationQueued);
    });
  });

  describe('markDeduped (PENDING → DEDUPED)', () => {
    it('transitions to DEDUPED', () => {
      const n = Notification.issue(issueProps());
      n.pullDomainEvents();

      n.markDeduped(LATER);

      expect(n.status).toBe(NotificationStatus.DEDUPED);
      const events = n.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationDeduped);
    });
  });

  describe('markSending (QUEUED → SENDING)', () => {
    it('transitions to SENDING from QUEUED', () => {
      const n = Notification.issue(issueProps());
      n.enqueue(NOW);

      n.markSending();

      expect(n.status).toBe(NotificationStatus.SENDING);
    });

    it('throws from PENDING', () => {
      const n = Notification.issue(issueProps());

      expect(() => {
        n.markSending();
      }).toThrow(InvalidStateTransitionError);
    });
  });

  describe('markSent (SENDING → SENT)', () => {
    it('transitions to SENT with providerId', () => {
      const n = Notification.issue(issueProps());
      n.enqueue(NOW);
      n.markSending();
      n.pullDomainEvents();

      n.markSent('ses-msg-123', LATER);

      expect(n.status).toBe(NotificationStatus.SENT);
      expect(n.toSnapshot().sentAt).toBe(LATER.iso());
      expect(n.attempts).toHaveLength(1);
      expect(n.attempts[0]?.providerId).toBe('ses-msg-123');

      const events = n.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationDelivered);
    });
  });

  describe('markRetryable (SENDING → PENDING)', () => {
    it('returns to PENDING and increments attempts', () => {
      const n = Notification.issue(issueProps());
      n.enqueue(NOW);
      n.markSending();
      n.pullDomainEvents();

      n.markRetryable('timeout', LATER);

      expect(n.status).toBe(NotificationStatus.PENDING);
      expect(n.attempts).toHaveLength(1);

      const events = n.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationRetryScheduled);
    });

    it('allows 3 retries total', () => {
      const n = Notification.issue(issueProps());

      for (let i = 0; i < 3; i++) {
        n.enqueue(NOW);
        n.markSending();
        if (i < 3) {
          n.markRetryable(`error-${String(i)}`, LATER);
        }
      }

      expect(n.attempts).toHaveLength(3);
      expect(n.status).toBe(NotificationStatus.PENDING);
    });

    it('throws MaxAttemptsReachedError when attempts = 3', () => {
      const n = Notification.issue(issueProps());

      for (let i = 0; i < 3; i++) {
        n.enqueue(NOW);
        n.markSending();
        n.markRetryable(`error-${String(i)}`, LATER);
      }

      n.enqueue(NOW);
      n.markSending();

      expect(() => {
        n.markRetryable('one-more', LATER);
      }).toThrow(MaxAttemptsReachedError);
    });
  });

  describe('markFailed (SENDING → FAILED)', () => {
    it('transitions to FAILED', () => {
      const n = Notification.issue(issueProps());
      n.enqueue(NOW);
      n.markSending();
      n.pullDomainEvents();

      n.markFailed('permanent error', LATER);

      expect(n.status).toBe(NotificationStatus.FAILED);
      expect(n.toSnapshot().failedAt).toBe(LATER.iso());

      const events = n.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationFailed);
    });
  });

  describe('markExpired', () => {
    it('PENDING → EXPIRED when now > expiresAt', () => {
      const n = Notification.issue(issueProps({ ttlHours: 1 }));
      n.pullDomainEvents();

      const afterExpiry = DateTime.from('2024-06-15T13:00:01Z');

      n.markExpired(afterExpiry);

      expect(n.status).toBe(NotificationStatus.EXPIRED);
      const events = n.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(NotificationExpired);
    });

    it('QUEUED → EXPIRED when now > expiresAt', () => {
      const n = Notification.issue(issueProps({ ttlHours: 1 }));
      n.enqueue(NOW);

      const afterExpiry = DateTime.from('2024-06-15T13:00:01Z');

      n.markExpired(afterExpiry);

      expect(n.status).toBe(NotificationStatus.EXPIRED);
    });

    it('throws from SENT (terminal)', () => {
      const n = Notification.issue(issueProps());
      n.enqueue(NOW);
      n.markSending();
      n.markSent('id', LATER);

      const farFuture = DateTime.from('2025-01-01T00:00:00Z');

      expect(() => {
        n.markExpired(farFuture);
      }).toThrow(InvalidStateTransitionError);
    });

    it('throws when now <= expiresAt', () => {
      const n = Notification.issue(issueProps({ ttlHours: 24 }));

      expect(() => {
        n.markExpired(LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  describe('terminal state guards', () => {
    it('cannot enqueue from DEDUPED', () => {
      const n = Notification.issue(issueProps());
      n.markDeduped(NOW);

      expect(() => {
        n.enqueue(LATER);
      }).toThrow(InvalidStateTransitionError);
    });

    it('cannot enqueue from FAILED', () => {
      const n = Notification.issue(issueProps());
      n.enqueue(NOW);
      n.markSending();
      n.markFailed('err', LATER);

      expect(() => {
        n.enqueue(LATER);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  describe('snapshot / restore', () => {
    it('roundtrips via toSnapshot / restore', () => {
      const n = Notification.issue(issueProps());
      n.enqueue(NOW);
      n.markSending();
      n.markSent('provider-1', LATER);

      const snapshot = n.toSnapshot();
      const restored = Notification.restore(snapshot);
      const restoredSnapshot = restored.toSnapshot();

      expect(restoredSnapshot).toEqual(snapshot);
    });
  });
});
