import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { ListNotificationsAdminQuery } from './list-notifications-admin.query';
import { NOTIFICATION_READ_PORT } from '../../di/tokens';

import type { INotificationReadPort } from '../../ports/notification-read.port';
import type {
  AdminNotificationDto,
  CursorPaginatedResult,
} from '../../read-models/notification.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(ListNotificationsAdminQuery)
export class ListNotificationsAdminHandler implements IQueryHandler<
  ListNotificationsAdminQuery,
  CursorPaginatedResult<AdminNotificationDto>
> {
  constructor(
    @Inject(NOTIFICATION_READ_PORT)
    private readonly readPort: INotificationReadPort,
  ) {}

  execute(
    query: ListNotificationsAdminQuery,
  ): Promise<CursorPaginatedResult<AdminNotificationDto>> {
    return this.readPort.listAdmin({
      status: query.status,
      templateCode: query.templateCode,
      channel: query.channel,
      userId: query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
