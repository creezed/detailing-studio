import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  AdminNotificationDto,
  CursorPaginatedResult,
  INotificationReadPort,
  ListAdminNotificationsFilter,
  ListMyNotificationsFilter,
  MyNotificationDto,
  NotificationDetailDto,
} from '@det/backend-notifications-application';
import type { NotificationId } from '@det/shared-types';

import { NotificationSchema } from '../schemas/notification.schema';

@Injectable()
export class NotificationReadPortAdapter implements INotificationReadPort {
  constructor(private readonly em: EntityManager) {}

  async listMy(
    filter: ListMyNotificationsFilter,
  ): Promise<CursorPaginatedResult<MyNotificationDto>> {
    const qb = this.em
      .createQueryBuilder(NotificationSchema, 'n')
      .select(['n.id', 'n.template_code', 'n.channel', 'n.status', 'n.created_at', 'n.sent_at'])
      .where({ recipientUserId: filter.userId })
      .orderBy({ createdAt: 'DESC' });

    if (filter.status) {
      qb.andWhere({ status: filter.status });
    }

    if (filter.templateCode) {
      qb.andWhere({ templateCode: filter.templateCode });
    }

    if (filter.channel) {
      qb.andWhere({ channel: filter.channel });
    }

    if (filter.dateFrom) {
      qb.andWhere({ createdAt: { $gte: new Date(filter.dateFrom) } });
    }

    if (filter.dateTo) {
      qb.andWhere({ createdAt: { $lte: new Date(filter.dateTo) } });
    }

    const limit = filter.limit ?? 20;

    if (filter.cursor) {
      qb.andWhere({ createdAt: { $lt: new Date(filter.cursor) } });
    }

    qb.limit(limit + 1);

    const rows = await qb.getResultList();
    const hasNext = rows.length > limit;
    const items = (hasNext ? rows.slice(0, limit) : rows).map((r) => this.toMyDto(r));
    const lastItem = hasNext ? items[items.length - 1] : undefined;
    const nextCursor = lastItem ? lastItem.createdAt : null;

    return { items, nextCursor };
  }

  async listAdmin(
    filter: ListAdminNotificationsFilter,
  ): Promise<CursorPaginatedResult<AdminNotificationDto>> {
    const qb = this.em
      .createQueryBuilder(NotificationSchema, 'n')
      .select('*')
      .orderBy({ createdAt: 'DESC' });

    if (filter.status) {
      qb.andWhere({ status: filter.status });
    }

    if (filter.templateCode) {
      qb.andWhere({ templateCode: filter.templateCode });
    }

    if (filter.channel) {
      qb.andWhere({ channel: filter.channel });
    }

    if (filter.userId) {
      qb.andWhere({ recipientUserId: filter.userId });
    }

    if (filter.dateFrom) {
      qb.andWhere({ createdAt: { $gte: new Date(filter.dateFrom) } });
    }

    if (filter.dateTo) {
      qb.andWhere({ createdAt: { $lte: new Date(filter.dateTo) } });
    }

    const limit = filter.limit ?? 20;

    if (filter.cursor) {
      qb.andWhere({ createdAt: { $lt: new Date(filter.cursor) } });
    }

    qb.limit(limit + 1);

    const rows = await qb.getResultList();
    const hasNext = rows.length > limit;
    const items = (hasNext ? rows.slice(0, limit) : rows).map((r) => this.toAdminDto(r));
    const lastAdminItem = hasNext ? items[items.length - 1] : undefined;
    const nextCursor = lastAdminItem ? lastAdminItem.createdAt : null;

    return { items, nextCursor };
  }

  async listFailed(limit: number): Promise<readonly AdminNotificationDto[]> {
    const rows = await this.em
      .createQueryBuilder(NotificationSchema, 'n')
      .select('*')
      .where({ status: 'FAILED' })
      .orderBy({ failedAt: 'DESC' })
      .limit(limit)
      .getResultList();

    return rows.map((r) => this.toAdminDto(r));
  }

  async getById(id: NotificationId): Promise<NotificationDetailDto | null> {
    const row = await this.em.findOne(NotificationSchema, { id });

    if (!row) {
      return null;
    }

    const rawAttempts = Array.isArray(row.attempts) ? row.attempts : [];
    const attempts = rawAttempts.map((a: unknown, i: number) => {
      const rec = a as Record<string, unknown>;

      return {
        attemptNo: i + 1,
        attemptedAt: typeof rec['attemptedAt'] === 'string' ? rec['attemptedAt'] : '',
        error: typeof rec['error'] === 'string' ? rec['error'] : null,
        providerId: typeof rec['providerId'] === 'string' ? rec['providerId'] : null,
      };
    });

    return {
      id: row.id,
      templateCode: row.templateCode,
      channel: row.channel,
      status: row.status,
      recipientUserId: row.recipientUserId,
      recipientPhone: row.recipientPhone,
      recipientEmail: row.recipientEmail,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.sentAt?.toISOString() ?? null,
      failedAt: row.failedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt.toISOString(),
      lastError: row.lastError,
      attempts,
      payload: row.payload,
    };
  }

  private toMyDto(r: NotificationSchema): MyNotificationDto {
    return {
      id: r.id,
      templateCode: r.templateCode,
      channel: r.channel,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      renderedPreview: '',
    };
  }

  private toAdminDto(r: NotificationSchema): AdminNotificationDto {
    return {
      id: r.id,
      templateCode: r.templateCode,
      channel: r.channel,
      status: r.status,
      recipientUserId: r.recipientUserId,
      recipientPhone: r.recipientPhone,
      recipientEmail: r.recipientEmail,
      createdAt: r.createdAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      failedAt: r.failedAt?.toISOString() ?? null,
      lastError: r.lastError,
      attempts: Array.isArray(r.attempts) ? r.attempts.length : 0,
      providerId: null,
      payload: r.payload,
    };
  }
}
