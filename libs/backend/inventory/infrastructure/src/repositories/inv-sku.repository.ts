import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  ISkuRepository,
  Sku,
  SkuId,
  ArticleNumber,
  Barcode,
} from '@det/backend-inventory-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import { mapSkuToDomain, mapSkuToPersistence } from '../mappers/inv-sku.mapper';
import { InvPackagingSchema } from '../persistence/inv-packaging.schema';
import { InvSkuSchema } from '../persistence/inv-sku.schema';

@Injectable()
export class InvSkuRepository implements ISkuRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: SkuId): Promise<Sku | null> {
    const schema = await this.em.findOne(InvSkuSchema, { id }, { populate: ['packagings'] });

    return schema ? mapSkuToDomain(schema) : null;
  }

  async findByArticleNumber(articleNumber: ArticleNumber): Promise<Sku | null> {
    const schema = await this.em.findOne(
      InvSkuSchema,
      { articleNumber: articleNumber.getValue() },
      { populate: ['packagings'] },
    );

    return schema ? mapSkuToDomain(schema) : null;
  }

  async findByBarcode(barcode: Barcode): Promise<Sku | null> {
    const schema = await this.em.findOne(
      InvSkuSchema,
      { barcode: barcode.getValue() },
      { populate: ['packagings'] },
    );

    return schema ? mapSkuToDomain(schema) : null;
  }

  async save(sku: Sku): Promise<void> {
    const existing = await this.em.findOne(
      InvSkuSchema,
      { id: sku.id },
      { populate: ['packagings'] },
    );
    const persisted = mapSkuToPersistence(sku, existing);
    const snap = sku.toSnapshot();

    const existingPackagings = existing ? existing.packagings.getItems() : [];

    for (const ep of existingPackagings) {
      this.em.remove(ep);
    }

    for (const p of snap.packagings) {
      const ps = new InvPackagingSchema();

      ps.id = p.id;
      ps.sku = persisted;
      ps.name = p.name;
      ps.coefficient = p.coefficient;
      this.em.persist(ps);
    }

    const events = sku.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
