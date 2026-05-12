import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { EventsHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';

import { NOTIFICATION_REPOSITORY } from '@det/backend-notifications-application';
import { NotificationIssued } from '@det/backend-notifications-domain';
import type { INotificationRepository } from '@det/backend-notifications-domain';
import { DateTime } from '@det/backend-shared-ddd';

import { NOTIFICATIONS_QUEUE } from './notifications-queue.constants';

import type { IEventHandler } from '@nestjs/cqrs';

@Injectable()
@EventsHandler(NotificationIssued)
export class NotificationIssuedOutboxRelay implements IEventHandler<NotificationIssued> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  async handle(event: NotificationIssued): Promise<void> {
    const notification = await this.notifRepo.findById(event.notificationId);

    if (!notification) {
      return;
    }

    const snap = notification.toSnapshot();
    const jobId = `notification:${snap.id}`;
    const now = Date.now();

    if (snap.scheduledFor !== null) {
      const scheduledMs = new Date(snap.scheduledFor).getTime();
      const delay = Math.max(scheduledMs - now, 0);

      await this.queue.add('send', { notificationId: snap.id }, { delay, jobId });
    } else {
      await this.queue.add('send', { notificationId: snap.id }, { jobId });
    }

    notification.enqueue(DateTime.from(event.issuedAt));
    await this.notifRepo.save(notification);
  }
}
