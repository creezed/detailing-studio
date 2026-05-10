import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { ISupplierRepository, Supplier, SupplierId } from '@det/backend-inventory-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import { mapSupplierToDomain, mapSupplierToPersistence } from '../mappers/inv-supplier.mapper';
import { InvSupplierSchema } from '../persistence/inv-supplier.schema';

@Injectable()
export class InvSupplierRepository implements ISupplierRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: SupplierId): Promise<Supplier | null> {
    const schema = await this.em.findOne(InvSupplierSchema, { id });

    return schema ? mapSupplierToDomain(schema) : null;
  }

  async save(supplier: Supplier): Promise<void> {
    const existing = await this.em.findOne(InvSupplierSchema, { id: supplier.id });
    const persisted = mapSupplierToPersistence(supplier, existing);
    const events = supplier.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
