import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { CatalogServiceSchema } from './catalog-service.schema';

@Entity({ tableName: 'catalog_service_price_history' })
export class CatalogServicePriceHistorySchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => CatalogServiceSchema, {
    fieldName: 'service_id',
    referenceColumnName: 'id',
  })
  declare service: CatalogServiceSchema;

  @Property({ fieldName: 'pricing_type', type: 'text' })
  declare pricingType: string;

  @Property({ fieldName: 'base_price_cents', nullable: true, type: 'bigint' })
  declare basePriceCents: string | null;

  @Property({ fieldName: 'pricing_snapshot', type: 'jsonb' })
  declare pricingSnapshot: Record<string, unknown>;

  @Property({ fieldName: 'changed_by', nullable: true, type: 'uuid' })
  declare changedBy: string | null;

  @Property({ fieldName: 'changed_at', type: 'timestamptz' })
  declare changedAt: Date;
}
