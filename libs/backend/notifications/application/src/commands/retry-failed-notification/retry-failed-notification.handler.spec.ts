import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  TemplatePayload,
} from '@det/backend-notifications-domain';
import type { INotificationRepository } from '@det/backend-notifications-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { NotificationId } from '@det/shared-types';
import type { UserId } from '@det/shared-types';

import { RetryFailedNotificationCommand } from './retry-failed-notification.command';
import { RetryFailedNotificationHandler } from './retry-failed-notification.handler';
import {
  NotificationNotFoundError,
  NotificationNotRetryableError,
} from '../../errors/application.errors';

const NOW = DateTime.from('2024-06-15T12:00:00Z');
const LATER = DateTime.from('2024-06-15T14:00:00Z');
const ID = NotificationId.from('00000000-0000-1000-8000-000000000001');
const USER_ID = 'u-1' as UserId;

function makeFailedNotification(): Notification {
  const n = Notification.issue({
    channel: NotificationChannel.EMAIL,
    dedupKey: null,
    id: ID,
    now: NOW,
    payload: TemplatePayload.from({ test: 'val' }),
    recipient: { kind: 'user', userId: USER_ID },
    scheduledFor: null,
    templateCode: 'USER_REGISTERED',
  });

  n.enqueue(NOW);
  n.markSending();
  n.markRetryable('err1', NOW);
  n.enqueue(NOW);
  n.markSending();
  n.markRetryable('err2', NOW);
  n.enqueue(NOW);
  n.markSending();
  n.markFailed('err3', NOW);
  n.pullDomainEvents();

  return n;
}

describe('RetryFailedNotificationHandler', () => {
  let handler: RetryFailedNotificationHandler;
  let notifRepo: INotificationRepository;
  let savedNotifications: Notification[];

  beforeEach(() => {
    savedNotifications = [];

    notifRepo = {
      findById: jest.fn().mockResolvedValue(null),
      findByDedupKey: jest.fn().mockResolvedValue([]),
      findScheduledBefore: jest.fn().mockResolvedValue([]),
      save: jest.fn((n: Notification) => {
        savedNotifications.push(n);

        return Promise.resolve();
      }),
    };

    const idGen: IIdGenerator = {
      generate: () => '00000000-0000-1000-8000-000000000099',
    };

    handler = new RetryFailedNotificationHandler(notifRepo, idGen);
  });

  it('creates new PENDING notification from FAILED one', async () => {
    const failed = makeFailedNotification();

    (notifRepo.findById as jest.Mock).mockResolvedValue(failed);

    await handler.execute(new RetryFailedNotificationCommand(ID, USER_ID, LATER));

    expect(savedNotifications).toHaveLength(1);
    const first = savedNotifications[0];

    expect(first).toBeDefined();
    expect(first?.status).toBe(NotificationStatus.PENDING);
  });

  it('throws NotificationNotFoundError for missing notification', async () => {
    await expect(
      handler.execute(new RetryFailedNotificationCommand(ID, USER_ID, LATER)),
    ).rejects.toThrow(NotificationNotFoundError);
  });

  it('throws NotificationNotRetryableError when status is not FAILED', async () => {
    const n = Notification.issue({
      channel: NotificationChannel.EMAIL,
      dedupKey: null,
      id: ID,
      now: NOW,
      payload: TemplatePayload.from({}),
      recipient: { kind: 'user', userId: USER_ID },
      scheduledFor: null,
      templateCode: 'USER_REGISTERED',
    });

    n.pullDomainEvents();
    (notifRepo.findById as jest.Mock).mockResolvedValue(n);

    await expect(
      handler.execute(new RetryFailedNotificationCommand(ID, USER_ID, LATER)),
    ).rejects.toThrow(NotificationNotRetryableError);
  });
});
