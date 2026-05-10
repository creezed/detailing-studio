import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { ITransferRepository, Transfer, TransferId } from '@det/backend-inventory-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import { mapTransferToDomain, mapTransferToPersistence } from '../mappers/inv-transfer.mapper';
import { InvTransferLineSchema } from '../persistence/inv-transfer-line.schema';
import { InvTransferSchema } from '../persistence/inv-transfer.schema';

@Injectable()
export class InvTransferRepository implements ITransferRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: TransferId): Promise<Transfer | null> {
    const schema = await this.em.findOne(InvTransferSchema, { id }, { populate: ['lines'] });

    return schema ? mapTransferToDomain(schema) : null;
  }

  async save(transfer: Transfer): Promise<void> {
    const existing = await this.em.findOne(
      InvTransferSchema,
      { id: transfer.id },
      { populate: ['lines'] },
    );
    const persisted = mapTransferToPersistence(transfer, existing);

    if (existing) {
      const oldLines = existing.lines.getItems();

      for (const ol of oldLines) {
        this.em.remove(ol);
      }
    }

    for (const line of transfer.lines) {
      const ls = new InvTransferLineSchema();

      ls.id = `${transfer.id as string}-${line.skuId as string}`;
      ls.transfer = persisted;
      ls.skuId = line.skuId;
      ls.quantity = line.quantity.amount.toString();
      ls.baseUnit = line.quantity.unit;
      this.em.persist(ls);
    }

    const events = transfer.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
