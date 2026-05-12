import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { ListMyNotificationsQuery } from './list-my-notifications.query';
import { NOTIFICATION_READ_PORT } from '../../di/tokens';

import type { INotificationReadPort } from '../../ports/notification-read.port';
import type {
  CursorPaginatedResult,
  MyNotificationDto,
} from '../../read-models/notification.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(ListMyNotificationsQuery)
export class ListMyNotificationsHandler implements IQueryHandler<
  ListMyNotificationsQuery,
  CursorPaginatedResult<MyNotificationDto>
> {
  constructor(
    @Inject(NOTIFICATION_READ_PORT)
    private readonly readPort: INotificationReadPort,
  ) {}

  execute(query: ListMyNotificationsQuery): Promise<CursorPaginatedResult<MyNotificationDto>> {
    return this.readPort.listMy({
      userId: query.userId,
      status: query.status,
      templateCode: query.templateCode,
      channel: query.channel,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
