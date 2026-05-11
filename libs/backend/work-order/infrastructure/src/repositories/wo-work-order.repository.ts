import { EntityManager, QueryOrder } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { OutboxService } from '@det/backend-shared-outbox';
import { WorkOrderStatus } from '@det/backend-work-order-domain';
import type {
  IWorkOrderRepository,
  WorkOrder,
  WorkOrderId,
  WorkOrderListFilter,
  WorkOrderListResult,
} from '@det/backend-work-order-domain';

import {
  mapWorkOrderToDomain,
  mapWorkOrderToPersistence,
  syncConsumptionLines,
  syncPhotos,
} from '../mappers/wo-work-order.mapper';
import { WoWorkOrderSchema } from '../persistence/wo-work-order.schema';

const POPULATE = ['lines', 'photos'] as const;

@Injectable()
export class WoWorkOrderRepository implements IWorkOrderRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: WorkOrderId): Promise<WorkOrder | null> {
    const schema = await this.em.findOne(
      WoWorkOrderSchema,
      { id: String(id) },
      { populate: POPULATE },
    );

    return schema ? mapWorkOrderToDomain(schema) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<WorkOrder | null> {
    const schema = await this.em.findOne(
      WoWorkOrderSchema,
      { appointmentId },
      { populate: POPULATE },
    );

    return schema ? mapWorkOrderToDomain(schema) : null;
  }

  async listByFilter(filter: WorkOrderListFilter): Promise<WorkOrderListResult> {
    const where: Record<string, unknown> = {};

    if (filter.branchId) where['branchId'] = filter.branchId;
    if (filter.masterId) where['masterId'] = filter.masterId;
    if (filter.status) where['status'] = filter.status;
    if (filter.cursor) where['id'] = { $gt: filter.cursor };

    const limit = filter.limit ?? 20;
    const schemas = await this.em.find(WoWorkOrderSchema, where, {
      orderBy: { id: QueryOrder.ASC },
      limit: limit + 1,
      populate: POPULATE,
    });

    const hasMore = schemas.length > limit;
    const items = (hasMore ? schemas.slice(0, limit) : schemas).map(mapWorkOrderToDomain);
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return { items, nextCursor: nextCursor ? String(nextCursor) : null };
  }

  async listByMaster(masterId: string, status?: WorkOrderStatus): Promise<readonly WorkOrder[]> {
    const where: Record<string, unknown> = { masterId };

    if (status) where['status'] = status;

    const schemas = await this.em.find(WoWorkOrderSchema, where, {
      orderBy: { openedAt: QueryOrder.DESC },
      populate: POPULATE,
    });

    return schemas.map(mapWorkOrderToDomain);
  }

  async listOpenByBranch(branchId: string): Promise<readonly WorkOrder[]> {
    const schemas = await this.em.find(
      WoWorkOrderSchema,
      {
        branchId,
        status: {
          $in: [
            WorkOrderStatus.OPEN,
            WorkOrderStatus.IN_PROGRESS,
            WorkOrderStatus.AWAITING_REVIEW,
            WorkOrderStatus.CLOSING,
          ],
        },
      },
      { orderBy: { openedAt: QueryOrder.DESC }, populate: POPULATE },
    );

    return schemas.map(mapWorkOrderToDomain);
  }

  async save(workOrder: WorkOrder): Promise<void> {
    const existing = await this.em.findOne(
      WoWorkOrderSchema,
      { id: String(workOrder.id) },
      { populate: POPULATE },
    );

    const persisted = mapWorkOrderToPersistence(workOrder, existing);
    const snap = workOrder.toSnapshot();

    const { toRemove: linesToRemove, toUpsert: linesToUpsert } = syncConsumptionLines(
      snap,
      persisted,
    );
    const { toRemove: photosToRemove, toUpsert: photosToUpsert } = syncPhotos(snap, persisted);

    for (const lr of linesToRemove) this.em.remove(lr);
    for (const pr of photosToRemove) this.em.remove(pr);
    for (const lu of linesToUpsert) this.em.persist(lu);
    for (const pu of photosToUpsert) this.em.persist(pu);

    const events = workOrder.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
