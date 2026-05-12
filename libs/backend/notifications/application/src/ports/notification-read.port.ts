import type { NotificationId, UserId } from '@det/shared-types';

import type {
  AdminNotificationDto,
  CursorPaginatedResult,
  MyNotificationDto,
  NotificationDetailDto,
} from '../read-models/notification.read-models';

export const NOTIFICATION_READ_PORT = Symbol('NOTIFICATION_READ_PORT');

export interface ListMyNotificationsFilter {
  readonly userId: UserId;
  readonly status?: string;
  readonly templateCode?: string;
  readonly channel?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ListAdminNotificationsFilter {
  readonly status?: string;
  readonly templateCode?: string;
  readonly channel?: string;
  readonly userId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface INotificationReadPort {
  listMy(filter: ListMyNotificationsFilter): Promise<CursorPaginatedResult<MyNotificationDto>>;

  listAdmin(
    filter: ListAdminNotificationsFilter,
  ): Promise<CursorPaginatedResult<AdminNotificationDto>>;

  listFailed(limit: number): Promise<readonly AdminNotificationDto[]>;

  getById(id: NotificationId): Promise<NotificationDetailDto | null>;
}
