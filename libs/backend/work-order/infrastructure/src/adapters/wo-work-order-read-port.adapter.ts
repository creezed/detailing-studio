import { EntityManager, QueryOrder } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  CursorPaginatedResult,
  IWorkOrderReadPort,
  ListWorkOrdersFilter,
  NormDeviationReportFilter,
  NormDeviationReportItem,
  WorkOrderListItemReadModel,
} from '@det/backend-work-order-application';
import type { WorkOrderStatus } from '@det/backend-work-order-domain';

import { WoWorkOrderSchema } from '../persistence/wo-work-order.schema';

@Injectable()
export class WoWorkOrderReadPortAdapter implements IWorkOrderReadPort {
  constructor(private readonly em: EntityManager) {}

  async list(
    filter: ListWorkOrdersFilter,
  ): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    const qb = this.em.createQueryBuilder(WoWorkOrderSchema, 'wo');

    if (filter.branchId) qb.andWhere({ branchId: filter.branchId });
    if (filter.masterId) qb.andWhere({ masterId: filter.masterId });
    if (filter.status) qb.andWhere({ status: filter.status });
    if (filter.cursor) qb.andWhere({ id: { $gt: filter.cursor } });
    if (filter.dateRange) {
      qb.andWhere({ openedAt: { $gte: new Date(filter.dateRange.from) } });
      qb.andWhere({ openedAt: { $lte: new Date(filter.dateRange.to) } });
    }

    qb.orderBy({ id: QueryOrder.ASC }).limit(filter.limit + 1);

    const rows = await qb.getResultList();

    const hasMore = rows.length > filter.limit;
    const items = hasMore ? rows.slice(0, filter.limit) : rows;

    const mapped: WorkOrderListItemReadModel[] = items.map((wo) => ({
      id: wo.id,
      appointmentId: wo.appointmentId,
      status: wo.status,
      openedAt: wo.openedAt.toISOString(),
      closedAt: wo.closedAt ? wo.closedAt.toISOString() : null,
      masterFullName: '',
      clientFullName: '',
      servicesCount: Array.isArray(wo.services) ? wo.services.length : 0,
      linesCount: 0,
      photosCount: 0,
    }));

    const nextCursor = hasMore ? (mapped[mapped.length - 1]?.id ?? null) : null;

    return { items: mapped, nextCursor };
  }

  async listClosedByClient(
    clientId: string,
    limit: number,
    cursor?: string,
  ): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    const qb = this.em.createQueryBuilder(WoWorkOrderSchema, 'wo');

    qb.andWhere({ clientId, status: 'CLOSED' as WorkOrderStatus });
    if (cursor) qb.andWhere({ id: { $gt: cursor } });
    qb.orderBy({ closedAt: QueryOrder.DESC }).limit(limit + 1);

    const rows = await qb.getResultList();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const mapped: WorkOrderListItemReadModel[] = items.map((wo) => ({
      id: wo.id,
      appointmentId: wo.appointmentId,
      status: wo.status,
      openedAt: wo.openedAt.toISOString(),
      closedAt: wo.closedAt ? wo.closedAt.toISOString() : null,
      masterFullName: '',
      clientFullName: '',
      servicesCount: Array.isArray(wo.services) ? wo.services.length : 0,
      linesCount: 0,
      photosCount: 0,
    }));

    const nextCursor = hasMore ? (mapped[mapped.length - 1]?.id ?? null) : null;

    return { items: mapped, nextCursor };
  }

  getNormDeviationReport(
    _filter: NormDeviationReportFilter, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<readonly NormDeviationReportItem[]> {
    return Promise.resolve([]);
  }
}
