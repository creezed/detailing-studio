import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { GetNotificationByIdQuery } from './get-notification-by-id.query';
import { NOTIFICATION_READ_PORT } from '../../di/tokens';
import { NotificationNotFoundError } from '../../errors/application.errors';

import type { INotificationReadPort } from '../../ports/notification-read.port';
import type { NotificationDetailDto } from '../../read-models/notification.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetNotificationByIdQuery)
export class GetNotificationByIdHandler implements IQueryHandler<
  GetNotificationByIdQuery,
  NotificationDetailDto
> {
  constructor(
    @Inject(NOTIFICATION_READ_PORT)
    private readonly readPort: INotificationReadPort,
  ) {}

  async execute(query: GetNotificationByIdQuery): Promise<NotificationDetailDto> {
    const result = await this.readPort.getById(query.notificationId);

    if (!result) {
      throw new NotificationNotFoundError(query.notificationId);
    }

    return result;
  }
}
