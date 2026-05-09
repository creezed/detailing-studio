import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, ID_GENERATOR } from '@det/backend-catalog-application';
import type {
  IServiceRepository,
  Service,
  ServiceCategoryId,
  ServiceId,
} from '@det/backend-catalog-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { OutboxService } from '@det/backend-shared-outbox';

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
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(CLOCK) private readonly clock: IClock,
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
    const now = this.clock.now().toDate();
    const persisted = mapCatalogServiceToPersistence(service, existing, this.em, this.idGen, now);
    const events = service.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    await this.em.persist(persisted).flush();
  }
}
