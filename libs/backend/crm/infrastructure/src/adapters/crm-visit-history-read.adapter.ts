import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  CursorPaginatedResult,
  IVisitHistoryReadPort,
  VisitHistoryItemReadModel,
} from '@det/backend-crm-application';

import { CrmVisitHistorySchema } from '../persistence/projections/crm-visit-history.schema';

@Injectable()
export class CrmVisitHistoryReadAdapter implements IVisitHistoryReadPort {
  constructor(private readonly em: EntityManager) {}

  async findByClientId(
    clientId: string,
    limit: number,
    cursor: string | null,
  ): Promise<CursorPaginatedResult<VisitHistoryItemReadModel>> {
    return this.findPaginated({ clientId }, limit, cursor);
  }

  async findByVehicleId(
    vehicleId: string,
    limit: number,
    cursor: string | null,
  ): Promise<CursorPaginatedResult<VisitHistoryItemReadModel>> {
    return this.findPaginated({ vehicleId }, limit, cursor);
  }

  async findAllByClientId(clientId: string): Promise<VisitHistoryItemReadModel[]> {
    const schemas = await this.em.find(
      CrmVisitHistorySchema,
      { clientId },
      { orderBy: { scheduledAt: 'DESC' } },
    );

    return schemas.map((s) => this.toReadModel(s));
  }

  private async findPaginated(
    filter: Record<string, string>,
    limit: number,
    cursor: string | null,
  ): Promise<CursorPaginatedResult<VisitHistoryItemReadModel>> {
    const where: Record<string, unknown> = { ...filter };

    if (cursor !== null) {
      where['scheduledAt'] = { $lt: new Date(cursor) };
    }

    const schemas = await this.em.find(CrmVisitHistorySchema, where, {
      orderBy: { scheduledAt: 'DESC' },
      limit: limit + 1,
    });

    const hasMore = schemas.length > limit;
    const items = (hasMore ? schemas.slice(0, limit) : schemas).map((s) => this.toReadModel(s));
    const nextCursor = hasMore ? (items[items.length - 1]?.scheduledAt ?? null) : null;

    return { items, nextCursor };
  }

  private toReadModel(schema: CrmVisitHistorySchema): VisitHistoryItemReadModel {
    return {
      id: schema.id,
      clientId: schema.clientId,
      vehicleId: schema.vehicleId,
      appointmentId: schema.appointmentId,
      workOrderId: schema.workOrderId,
      branchId: schema.branchId,
      masterId: schema.masterId,
      servicesSummary: schema.servicesSummary,
      scheduledAt: schema.scheduledAt.toISOString(),
      startedAt: schema.startedAt?.toISOString() ?? null,
      completedAt: schema.completedAt?.toISOString() ?? null,
      cancelledAt: schema.cancelledAt?.toISOString() ?? null,
      status: schema.status as VisitHistoryItemReadModel['status'],
      totalAmountCents: schema.totalAmountCents,
      materialsTotalCents: schema.materialsTotalCents,
      photoCount: schema.photoCount,
      beforePhotoUrls: schema.beforePhotoUrls,
      afterPhotoUrls: schema.afterPhotoUrls,
      updatedAt: schema.updatedAt.toISOString(),
    };
  }
}
