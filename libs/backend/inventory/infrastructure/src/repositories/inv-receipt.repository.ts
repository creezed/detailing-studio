import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { IReceiptRepository, Receipt, ReceiptId } from '@det/backend-inventory-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import {
  mapReceiptLineToPersistence,
  mapReceiptToDomain,
  mapReceiptToPersistence,
} from '../mappers/inv-receipt.mapper';
import { InvReceiptSchema } from '../persistence/inv-receipt.schema';

@Injectable()
export class InvReceiptRepository implements IReceiptRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: ReceiptId): Promise<Receipt | null> {
    const schema = await this.em.findOne(InvReceiptSchema, { id }, { populate: ['lines'] });

    return schema ? mapReceiptToDomain(schema) : null;
  }

  async save(receipt: Receipt): Promise<void> {
    const existing = await this.em.findOne(
      InvReceiptSchema,
      { id: receipt.id },
      { populate: ['lines'] },
    );
    const persisted = mapReceiptToPersistence(receipt, existing);

    if (existing) {
      const oldLines = existing.lines.getItems();

      for (const ol of oldLines) {
        this.em.remove(ol);
      }
    }

    for (const line of receipt.lines) {
      const ls = mapReceiptLineToPersistence(line, persisted);

      this.em.persist(ls);
    }

    const events = receipt.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
