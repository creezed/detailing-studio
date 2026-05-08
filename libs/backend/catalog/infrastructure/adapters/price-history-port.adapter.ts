import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type { IPriceHistoryPort, PriceHistoryEntry } from '@det/backend/catalog/application';
import type { ServicePricingSnapshot } from '@det/backend/catalog/domain';

import { CatalogServicePriceHistorySchema } from '../persistence/catalog-service-price-history.schema';
import { CatalogServiceSchema } from '../persistence/catalog-service.schema';

@Injectable()
export class PriceHistoryPortAdapter implements IPriceHistoryPort {
  constructor(private readonly em: EntityManager) {}

  async append(entry: PriceHistoryEntry): Promise<void> {
    const schema = new CatalogServicePriceHistorySchema();

    schema.id = entry.id;
    schema.service = this.em.getReference(CatalogServiceSchema, entry.serviceId);
    schema.pricingType = entry.pricingType;
    schema.basePriceCents = entry.basePriceCents;
    schema.pricingSnapshot = entry.pricingSnapshot as unknown as Record<string, unknown>;
    schema.changedBy = null;
    schema.changedAt = entry.changedAt;

    await this.em.persist(schema).flush();
  }

  async findByServiceId(serviceId: string): Promise<readonly PriceHistoryEntry[]> {
    const schemas = await this.em.find(
      CatalogServicePriceHistorySchema,
      { service: { id: serviceId } },
      { orderBy: { changedAt: 'DESC' } },
    );

    return schemas.map((s) => ({
      basePriceCents: s.basePriceCents,
      changedAt: s.changedAt,
      id: s.id,
      pricingSnapshot: s.pricingSnapshot as unknown as ServicePricingSnapshot,
      pricingType: s.pricingType,
      serviceId,
    }));
  }
}
