import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { Notification, NotificationStatus } from '@det/backend-notifications-domain';
import type {
  INotificationRepository,
  NotificationChannel,
  TemplateCode,
  TemplatePayload,
} from '@det/backend-notifications-domain';
import { ID_GENERATOR } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import type { NotificationId } from '@det/shared-types';

import { RetryFailedNotificationCommand } from './retry-failed-notification.command';
import { NOTIFICATION_REPOSITORY } from '../../di/tokens';
import {
  NotificationNotFoundError,
  NotificationNotRetryableError,
} from '../../errors/application.errors';

import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(RetryFailedNotificationCommand)
export class RetryFailedNotificationHandler implements ICommandHandler<
  RetryFailedNotificationCommand,
  void
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifRepo: INotificationRepository,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: RetryFailedNotificationCommand): Promise<void> {
    const notification = await this.notifRepo.findById(cmd.notificationId);

    if (!notification) {
      throw new NotificationNotFoundError(cmd.notificationId);
    }

    if (notification.status !== NotificationStatus.FAILED) {
      throw new NotificationNotRetryableError(cmd.notificationId, notification.status);
    }

    const snapshot = notification.toSnapshot();

    const retried = Notification.issue({
      channel: snapshot.channel as NotificationChannel,
      dedupKey: null,
      id: this.idGen.generate() as NotificationId,
      now: cmd.now,
      payload: snapshot.payload as TemplatePayload,
      recipient: snapshot.recipient,
      scheduledFor: null,
      templateCode: snapshot.templateCode as TemplateCode,
    });

    await this.notifRepo.save(retried);
  }
}
