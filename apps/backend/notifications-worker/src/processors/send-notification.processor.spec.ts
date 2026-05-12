/* eslint-disable @typescript-eslint/unbound-method */
import type { INotificationDispatcherPort } from '@det/backend-notifications-application';
import type { INotificationRepository, Notification } from '@det/backend-notifications-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { IClock } from '@det/backend-shared-ddd';

import { SendNotificationProcessor } from './send-notification.processor';

import type { Job } from 'bullmq';

function createMockNotification(
  overrides: {
    status?: string;
    expiresAt?: string;
    attemptsCount?: number;
  } = {},
): Notification {
  const status = overrides.status ?? 'PENDING';
  const expiresAt = overrides.expiresAt ?? new Date(Date.now() + 3600_000).toISOString();

  return {
    id: 'ntf-1',
    status,
    attempts: Array.from({ length: overrides.attemptsCount ?? 0 }),
    toSnapshot: () => ({
      id: 'ntf-1',
      status,
      expiresAt,
      recipient: { kind: 'email', email: 'test@test.com' },
      templateCode: 'USER_REGISTERED',
      channel: 'EMAIL',
      payload: {},
      attempts: [],
      scheduledFor: null,
      dedupKey: null,
      createdAt: new Date().toISOString(),
      sentAt: null,
      failedAt: null,
      lastError: null,
    }),
    markSending: jest.fn(),
    markSent: jest.fn(),
    markRetryable: jest.fn(),
    markFailed: jest.fn(),
    markExpired: jest.fn(),
    pullDomainEvents: () => [],
  } as unknown as Notification;
}

function createJob(notificationId = 'ntf-1'): Job<{ notificationId: string }> {
  return { data: { notificationId }, id: 'job-1' } as Job<{ notificationId: string }>;
}

describe('SendNotificationProcessor', () => {
  let processor: SendNotificationProcessor;
  let repo: jest.Mocked<INotificationRepository>;
  let dispatcher: jest.Mocked<INotificationDispatcherPort>;
  let clock: IClock;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByDedupKey: jest.fn(),
      findScheduledBefore: jest.fn(),
      save: jest.fn(),
    };

    dispatcher = {
      dispatch: jest.fn(),
    };

    clock = { now: () => DateTime.now() };

    processor = new SendNotificationProcessor(repo, dispatcher, clock);
  });

  it('skips if notification not found', async () => {
    repo.findById.mockResolvedValue(null);

    await processor.process(createJob());

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('skips terminal-state notification (SENT)', async () => {
    const notification = createMockNotification({ status: 'SENT' });

    repo.findById.mockResolvedValue(notification);

    await processor.process(createJob());

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('marks expired if past expiresAt', async () => {
    const notification = createMockNotification({
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    repo.findById.mockResolvedValue(notification);

    await processor.process(createJob());

    expect(notification.markExpired).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(notification);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('happy path: dispatch ok → markSent', async () => {
    const notification = createMockNotification();

    repo.findById.mockResolvedValue(notification);
    dispatcher.dispatch.mockResolvedValue({ ok: true, providerId: 'prov-1' });

    await processor.process(createJob());

    expect(notification.markSending).toHaveBeenCalled();
    expect(notification.markSent).toHaveBeenCalledWith('prov-1', expect.anything());
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it('retryable error with attempts < 3 → throws for BullMQ retry', async () => {
    const notification = createMockNotification({ attemptsCount: 1 });

    repo.findById.mockResolvedValue(notification);
    dispatcher.dispatch.mockResolvedValue({ ok: false, error: 'timeout', retryable: true });

    await expect(processor.process(createJob())).rejects.toThrow('timeout');

    expect(notification.markRetryable).toHaveBeenCalledWith('timeout', expect.anything());
  });

  it('non-retryable error → markFailed immediately', async () => {
    const notification = createMockNotification();

    repo.findById.mockResolvedValue(notification);
    dispatcher.dispatch.mockResolvedValue({ ok: false, error: 'bad-recipient', retryable: false });

    await processor.process(createJob());

    expect(notification.markFailed).toHaveBeenCalledWith('bad-recipient', expect.anything());
  });

  it('retryable error with attempts >= 3 → markFailed', async () => {
    const notification = createMockNotification({ attemptsCount: 3 });

    repo.findById.mockResolvedValue(notification);
    dispatcher.dispatch.mockResolvedValue({ ok: false, error: 'timeout', retryable: true });

    await processor.process(createJob());

    expect(notification.markFailed).toHaveBeenCalledWith('timeout', expect.anything());
  });
});
