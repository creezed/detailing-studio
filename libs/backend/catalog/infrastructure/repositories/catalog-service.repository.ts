import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  IServiceRepository,
  Service,
  ServiceCategoryId,
  ServiceId,
} from '@det/backend/catalog/domain';
import { OutboxService } from '@det/backend/shared/outbox';

import {
  mapCatalogServiceToDomain,
  mapCatalogServiceToPersistence,
} from '../mappers/catalog-service.mapper';
import { CatalogServiceSchema } from '../persistence/catalog-service.schema';

import type { FilterQuery } from '@mikro-orm/core';

@Injectable()
export class CatalogServiceRepository implements IServiceRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: ServiceId): Promise<Service | null> {
    const schema = await this.em.findOne(
      CatalogServiceSchema,
      { id },
      { populate: ['pricingEntries', 'materialNorms'] },
    );

    return schema ? mapCatalogServiceToDomain(schema) : null;
  }

  async findAll(filters: {
    categoryId?: ServiceCategoryId;
    isActive?: boolean;
  }): Promise<Service[]> {
    const where: FilterQuery<CatalogServiceSchema> = {};

    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const schemas = await this.em.find(CatalogServiceSchema, where, {
      orderBy: { displayOrder: 'ASC' },
      populate: ['pricingEntries', 'materialNorms'],
    });

    return schemas.map(mapCatalogServiceToDomain);
  }

  async save(service: Service): Promise<void> {
    const existing = await this.em.findOne(
      CatalogServiceSchema,
      { id: service.id },
      { populate: ['pricingEntries', 'materialNorms'] },
    );
    const persisted = mapCatalogServiceToPersistence(service, existing, this.em);
    const events = service.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
