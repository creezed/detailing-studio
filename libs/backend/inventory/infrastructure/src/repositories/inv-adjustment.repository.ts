import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  Adjustment,
  AdjustmentId,
  IAdjustmentRepository,
} from '@det/backend-inventory-domain';
import { AdjustmentStatus } from '@det/backend-inventory-domain';
import { OutboxService } from '@det/backend-shared-outbox';
import type { BranchId } from '@det/shared-types';

import {
  mapAdjustmentToDomain,
  mapAdjustmentToPersistence,
} from '../mappers/inv-adjustment.mapper';
import { InvAdjustmentLineSchema } from '../persistence/inv-adjustment-line.schema';
import { InvAdjustmentSchema } from '../persistence/inv-adjustment.schema';

@Injectable()
export class InvAdjustmentRepository implements IAdjustmentRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: AdjustmentId): Promise<Adjustment | null> {
    const schema = await this.em.findOne(InvAdjustmentSchema, { id }, { populate: ['lines'] });

    return schema ? mapAdjustmentToDomain(schema) : null;
  }

  async save(adjustment: Adjustment): Promise<void> {
    const existing = await this.em.findOne(
      InvAdjustmentSchema,
      { id: adjustment.id },
      { populate: ['lines'] },
    );
    const persisted = mapAdjustmentToPersistence(adjustment, existing);

    if (!existing) {
      persisted.branchId = '';
      persisted.reason = '';
      persisted.createdBy = '';
      persisted.createdAt = new Date();
    }

    if (existing) {
      const oldLines = existing.lines.getItems();

      for (const ol of oldLines) {
        this.em.remove(ol);
      }
    }

    for (const line of adjustment.lines) {
      const ls = new InvAdjustmentLineSchema();

      ls.id = `${adjustment.id as string}-${line.skuId as string}`;
      ls.adjustment = persisted;
      ls.skuId = line.skuId;
      ls.delta = line.delta.amount.toString();
      ls.snapshotUnitCostCents = line.snapshotUnitCost.cents.toString();
      this.em.persist(ls);
    }

    const events = adjustment.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }

  async findPendingApprovals(branchId?: BranchId): Promise<readonly Adjustment[]> {
    const where: Record<string, unknown> = { status: AdjustmentStatus.PENDING };

    if (branchId) {
      where['branchId'] = branchId;
    }

    const schemas = await this.em.find(InvAdjustmentSchema, where, { populate: ['lines'] });

    return schemas.map(mapAdjustmentToDomain);
  }
}
