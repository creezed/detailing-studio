import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { AnonymizationRequest, IAnonymizationRequestPort } from '@det/backend-crm-application';

import { CrmAnonymizationRequestSchema } from '../persistence/crm-anonymization-request.schema';

@Injectable()
export class CrmAnonymizationRequestAdapter implements IAnonymizationRequestPort {
  constructor(private readonly em: EntityManager) {}

  async create(request: AnonymizationRequest): Promise<void> {
    const schema = new CrmAnonymizationRequestSchema();
    schema.id = request.id;
    schema.clientId = request.clientId;
    schema.requestedBy = request.requestedBy;
    schema.reason = request.reason;
    schema.requestedAt = new Date(request.requestedAt);
    schema.dueBy = new Date(request.dueBy);
    schema.status = request.status;
    schema.completedBy = request.completedBy;
    schema.completedAt = request.completedAt !== null ? new Date(request.completedAt) : null;
    schema.cancelledBy = request.cancelledBy;
    schema.cancelledAt = request.cancelledAt !== null ? new Date(request.cancelledAt) : null;
    schema.cancelReason = request.cancelReason;

    await this.em.persist(schema).flush();
  }

  async findById(id: string): Promise<AnonymizationRequest | null> {
    const schema = await this.em.findOne(CrmAnonymizationRequestSchema, { id });

    return schema ? this.toDomain(schema) : null;
  }

  async findPendingByClientId(clientId: string): Promise<AnonymizationRequest | null> {
    const schema = await this.em.findOne(CrmAnonymizationRequestSchema, {
      clientId,
      status: 'PENDING',
    });

    return schema ? this.toDomain(schema) : null;
  }

  async markCompleted(id: string, completedBy: string, completedAt: string): Promise<void> {
    const schema = await this.em.findOneOrFail(CrmAnonymizationRequestSchema, { id });
    schema.status = 'COMPLETED';
    schema.completedBy = completedBy;
    schema.completedAt = new Date(completedAt);
    await this.em.flush();
  }

  async markCancelled(
    id: string,
    cancelledBy: string,
    cancelledAt: string,
    reason: string,
  ): Promise<void> {
    const schema = await this.em.findOneOrFail(CrmAnonymizationRequestSchema, { id });
    schema.status = 'CANCELLED';
    schema.cancelledBy = cancelledBy;
    schema.cancelledAt = new Date(cancelledAt);
    schema.cancelReason = reason;
    await this.em.flush();
  }

  private toDomain(schema: CrmAnonymizationRequestSchema): AnonymizationRequest {
    return {
      id: schema.id,
      clientId: schema.clientId,
      requestedBy: schema.requestedBy,
      reason: schema.reason,
      requestedAt: schema.requestedAt.toISOString(),
      dueBy: schema.dueBy.toISOString(),
      status: schema.status as AnonymizationRequest['status'],
      completedBy: schema.completedBy,
      completedAt: schema.completedAt?.toISOString() ?? null,
      cancelledBy: schema.cancelledBy,
      cancelledAt: schema.cancelledAt?.toISOString() ?? null,
      cancelReason: schema.cancelReason,
    };
  }
}
