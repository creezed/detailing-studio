import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  IServiceCategoryRepository,
  ServiceCategory,
  ServiceCategoryId,
} from '@det/backend/catalog/domain';
import { OutboxService } from '@det/backend/shared/outbox';

import {
  mapCatalogServiceCategoryToDomain,
  mapCatalogServiceCategoryToPersistence,
} from '../mappers/catalog-service-category.mapper';
import { CatalogServiceCategorySchema } from '../persistence/catalog-service-category.schema';

@Injectable()
export class CatalogServiceCategoryRepository implements IServiceCategoryRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: ServiceCategoryId): Promise<ServiceCategory | null> {
    const schema = await this.em.findOne(CatalogServiceCategorySchema, { id });

    return schema ? mapCatalogServiceCategoryToDomain(schema) : null;
  }

  async findAll(): Promise<ServiceCategory[]> {
    const schemas = await this.em.find(
      CatalogServiceCategorySchema,
      {},
      { orderBy: { displayOrder: 'ASC' } },
    );

    return schemas.map(mapCatalogServiceCategoryToDomain);
  }

  async save(category: ServiceCategory): Promise<void> {
    const existing = await this.em.findOne(CatalogServiceCategorySchema, { id: category.id });
    const persisted = mapCatalogServiceCategoryToPersistence(category, existing);
    const events = category.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
