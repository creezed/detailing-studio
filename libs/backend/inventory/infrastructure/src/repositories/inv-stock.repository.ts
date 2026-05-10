import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { Stock, StockId } from '@det/backend-inventory-domain';
import type { IStockRepository } from '@det/backend-inventory-domain';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import { DateTime, Quantity } from '@det/backend-shared-ddd';
import { OutboxService } from '@det/backend-shared-outbox';
import type { BranchId, SkuId } from '@det/shared-types';

import { mapStockToDomain, mapStockToPersistence } from '../mappers/inv-stock.mapper';
import { InvBatchSchema } from '../persistence/inv-batch.schema';
import { InvStockSchema } from '../persistence/inv-stock.schema';

@Injectable()
export class InvStockRepository implements IStockRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findByCompositeId(skuId: SkuId, branchId: BranchId): Promise<Stock | null> {
    const schema = await this.em.findOne(
      InvStockSchema,
      { branchId: branchId as string, skuId: skuId as string },
      { populate: ['batches'] },
    );

    return schema ? mapStockToDomain(schema) : null;
  }

  async findOrCreate(
    skuId: SkuId,
    branchId: BranchId,
    baseUnit: UnitOfMeasure,
    reorderLevel: Quantity,
  ): Promise<Stock> {
    const existing = await this.findByCompositeId(skuId, branchId);

    if (existing) {
      return existing;
    }

    const now = DateTime.from(new Date().toISOString());

    return Stock.createEmpty(skuId, branchId, baseUnit, reorderLevel, now);
  }

  async save(stock: Stock): Promise<void> {
    const compositeKey = {
      branchId: StockId.branchId(stock.id),
      skuId: StockId.skuId(stock.id),
    };
    const existing = await this.em.findOne(InvStockSchema, compositeKey, {
      populate: ['batches'],
    });
    const persisted = mapStockToPersistence(stock, existing);

    const snap = stock.toSnapshot();

    if (existing) {
      const oldBatches = existing.batches.getItems();

      for (const ob of oldBatches) {
        this.em.remove(ob);
      }
    }

    for (const b of snap.batches) {
      const bs = new InvBatchSchema();

      bs.id = b.id;
      bs.stock = persisted;
      bs.supplierId = b.supplierId;
      bs.sourceType = b.sourceType;
      bs.sourceDocId = b.sourceDocId;
      bs.initialQuantity = b.initialQuantity.toString();
      bs.remainingQuantity = b.remainingQuantity.toString();
      bs.unitCostCents = b.unitCostCents;
      bs.expiresAt = b.expiresAt !== null ? new Date(b.expiresAt) : null;
      bs.receivedAt = new Date(b.receivedAt);
      this.em.persist(bs);
    }

    const events = stock.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }

  async findLowStock(branchId: BranchId): Promise<readonly Stock[]> {
    const schemas = await this.em.find(
      InvStockSchema,
      { branchId: branchId as string },
      { populate: ['batches'] },
    );

    return schemas.map(mapStockToDomain).filter((s) => {
      const snap = s.toSnapshot();
      const total = snap.batches.reduce((acc, b) => acc + b.remainingQuantity, 0);

      return total <= snap.reorderLevel;
    });
  }
}
