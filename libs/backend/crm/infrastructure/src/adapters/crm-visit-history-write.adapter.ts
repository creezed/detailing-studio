import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { IVisitHistoryWritePort, UpsertVisitHistoryData } from '@det/backend-crm-application';

import { CrmVisitHistorySchema } from '../persistence/projections/crm-visit-history.schema';

@Injectable()
export class CrmVisitHistoryWriteAdapter implements IVisitHistoryWritePort {
  constructor(private readonly em: EntityManager) {}

  async upsert(data: UpsertVisitHistoryData): Promise<void> {
    const existing = await this.em.findOne(CrmVisitHistorySchema, {
      appointmentId: data.appointmentId,
    });

    const schema = existing ?? new CrmVisitHistorySchema();
    schema.id = existing?.id ?? data.id;
    schema.clientId = data.clientId;
    schema.vehicleId = data.vehicleId;
    schema.appointmentId = data.appointmentId;
    schema.workOrderId = data.workOrderId;
    schema.branchId = data.branchId;
    schema.masterId = data.masterId;
    schema.servicesSummary = [...data.servicesSummary];
    schema.scheduledAt = new Date(data.scheduledAt);
    schema.startedAt = data.startedAt !== null ? new Date(data.startedAt) : null;
    schema.completedAt = data.completedAt !== null ? new Date(data.completedAt) : null;
    schema.cancelledAt = data.cancelledAt !== null ? new Date(data.cancelledAt) : null;
    schema.status = data.status;
    schema.totalAmountCents = data.totalAmountCents;
    schema.materialsTotalCents = data.materialsTotalCents;
    schema.photoCount = data.photoCount;
    schema.beforePhotoUrls = data.beforePhotoUrls !== null ? [...data.beforePhotoUrls] : null;
    schema.afterPhotoUrls = data.afterPhotoUrls !== null ? [...data.afterPhotoUrls] : null;
    schema.updatedAt = new Date();

    await this.em.persist(schema).flush();
  }

  async updateByAppointmentId(
    appointmentId: string,
    patch: Partial<UpsertVisitHistoryData>,
  ): Promise<void> {
    const schema = await this.em.findOne(CrmVisitHistorySchema, { appointmentId });

    if (!schema) return;

    if (patch.scheduledAt !== undefined) schema.scheduledAt = new Date(patch.scheduledAt);
    if (patch.status !== undefined) schema.status = patch.status;
    if (patch.cancelledAt !== undefined)
      schema.cancelledAt = patch.cancelledAt !== null ? new Date(patch.cancelledAt) : null;
    if (patch.workOrderId !== undefined) schema.workOrderId = patch.workOrderId ?? null;
    if (patch.startedAt !== undefined)
      schema.startedAt = patch.startedAt !== null ? new Date(patch.startedAt) : null;
    if (patch.completedAt !== undefined)
      schema.completedAt = patch.completedAt !== null ? new Date(patch.completedAt) : null;
    if (patch.totalAmountCents !== undefined)
      schema.totalAmountCents = patch.totalAmountCents ?? null;
    if (patch.materialsTotalCents !== undefined)
      schema.materialsTotalCents = patch.materialsTotalCents ?? null;
    if (patch.photoCount !== undefined) schema.photoCount = patch.photoCount;
    if (patch.beforePhotoUrls !== undefined)
      schema.beforePhotoUrls = patch.beforePhotoUrls !== null ? [...patch.beforePhotoUrls] : null;
    if (patch.afterPhotoUrls !== undefined)
      schema.afterPhotoUrls = patch.afterPhotoUrls !== null ? [...patch.afterPhotoUrls] : null;
    schema.updatedAt = new Date();

    await this.em.flush();
  }

  async clearPhotosForClient(clientId: string): Promise<void> {
    const schemas = await this.em.find(CrmVisitHistorySchema, { clientId });

    for (const schema of schemas) {
      schema.beforePhotoUrls = null;
      schema.afterPhotoUrls = null;
      schema.updatedAt = new Date();
    }

    await this.em.flush();
  }
}
