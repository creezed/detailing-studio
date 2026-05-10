import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  IStockTakingRepository,
  StockTaking,
  StockTakingId,
} from '@det/backend-inventory-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import {
  mapStockTakingToDomain,
  mapStockTakingToPersistence,
} from '../mappers/inv-stock-taking.mapper';
import { InvStockTakingLineSchema } from '../persistence/inv-stock-taking-line.schema';
import { InvStockTakingSchema } from '../persistence/inv-stock-taking.schema';

@Injectable()
export class InvStockTakingRepository implements IStockTakingRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: StockTakingId): Promise<StockTaking | null> {
    const schema = await this.em.findOne(InvStockTakingSchema, { id }, { populate: ['lines'] });

    return schema ? mapStockTakingToDomain(schema) : null;
  }

  async save(stockTaking: StockTaking): Promise<void> {
    const existing = await this.em.findOne(
      InvStockTakingSchema,
      { id: stockTaking.id },
      { populate: ['lines'] },
    );
    const persisted = mapStockTakingToPersistence(stockTaking, existing);

    if (!existing) {
      persisted.branchId = '';
      persisted.createdBy = '';
      persisted.startedAt = new Date();
    }

    if (existing) {
      const oldLines = existing.lines.getItems();

      for (const ol of oldLines) {
        this.em.remove(ol);
      }
    }

    for (const line of stockTaking.lines) {
      const ls = new InvStockTakingLineSchema();

      ls.id = `${stockTaking.id as string}-${line.skuId as string}`;
      ls.stockTaking = persisted;
      ls.skuId = line.skuId;
      ls.expectedQuantity = line.expectedQuantity.amount.toString();
      ls.actualQuantity =
        line.actualQuantity !== null ? line.actualQuantity.amount.toString() : null;
      ls.baseUnit = line.expectedQuantity.unit;
      this.em.persist(ls);
    }

    const events = stockTaking.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
