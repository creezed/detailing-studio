import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';

import {
  CLOCK,
  NOTIFICATION_DISPATCHER,
  NOTIFICATION_REPOSITORY,
} from '@det/backend-notifications-application';
import type { INotificationDispatcherPort } from '@det/backend-notifications-application';
import type { INotificationRepository } from '@det/backend-notifications-domain';
import { NOTIFICATIONS_QUEUE } from '@det/backend-notifications-infrastructure';
import type { IClock } from '@det/backend-shared-ddd';

import { NOTIFICATIONS_CONCURRENCY } from '../config/worker.config';

import type { Job } from 'bullmq';

export interface SendNotificationJobData {
  readonly notificationId: string;
}

@Processor(NOTIFICATIONS_QUEUE, {
  concurrency: NOTIFICATIONS_CONCURRENCY,
})
export class SendNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(SendNotificationProcessor.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repo: INotificationRepository,
    @Inject(NOTIFICATION_DISPATCHER) private readonly dispatcher: INotificationDispatcherPort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {
    super();
  }

  async process(job: Job<SendNotificationJobData>): Promise<void> {
    const notification = await this.repo.findById(
      job.data.notificationId as Parameters<INotificationRepository['findById']>[0],
    );

    if (!notification) {
      this.logger.warn(`Notification ${job.data.notificationId} not found, skipping`);

      return;
    }

    const now = this.clock.now();
    const snap = notification.toSnapshot();

    if (
      snap.status === 'SENT' ||
      snap.status === 'FAILED' ||
      snap.status === 'EXPIRED' ||
      snap.status === 'DEDUPED'
    ) {
      this.logger.warn(
        `Notification ${job.data.notificationId} in terminal state ${snap.status}, skipping`,
      );

      return;
    }

    const expiresAtMs = new Date(snap.expiresAt).getTime();

    if (now.toDate().getTime() > expiresAtMs) {
      try {
        notification.markExpired(now);
      } catch {
        // already in terminal state — ignore
      }

      await this.repo.save(notification);

      return;
    }

    notification.markSending();
    await this.repo.save(notification);

    const sendingSnap = notification.toSnapshot();
    const result = await this.dispatcher.dispatch(sendingSnap);

    if (result.ok) {
      notification.markSent(result.providerId, this.clock.now());
      await this.repo.save(notification);
    } else if (result.retryable && notification.attempts.length < 3) {
      notification.markRetryable(result.error, this.clock.now());
      await this.repo.save(notification);
      throw new Error(result.error);
    } else {
      notification.markFailed(result.error, this.clock.now());
      await this.repo.save(notification);
    }
  }
}
