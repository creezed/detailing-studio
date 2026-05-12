import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { ListFailedNotificationsQuery } from './list-failed-notifications.query';
import { NOTIFICATION_READ_PORT } from '../../di/tokens';

import type { INotificationReadPort } from '../../ports/notification-read.port';
import type { AdminNotificationDto } from '../../read-models/notification.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(ListFailedNotificationsQuery)
export class ListFailedNotificationsHandler implements IQueryHandler<
  ListFailedNotificationsQuery,
  readonly AdminNotificationDto[]
> {
  constructor(
    @Inject(NOTIFICATION_READ_PORT)
    private readonly readPort: INotificationReadPort,
  ) {}

  execute(query: ListFailedNotificationsQuery): Promise<readonly AdminNotificationDto[]> {
    return this.readPort.listFailed(query.limit);
  }
}
