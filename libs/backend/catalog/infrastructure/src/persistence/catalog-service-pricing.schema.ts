import { Entity, ManyToOne, PrimaryKeyProp, Property } from '@mikro-orm/core';

import { CatalogServiceSchema } from './catalog-service.schema';

@Entity({ tableName: 'catalog_service_pricing' })
export class CatalogServicePricingSchema {
  @ManyToOne(() => CatalogServiceSchema, {
    fieldName: 'service_id',
    primary: true,
    referenceColumnName: 'id',
  })
  declare service: CatalogServiceSchema;

  @Property({ fieldName: 'body_type', primary: true, type: 'text' })
  declare bodyType: string;

  [PrimaryKeyProp]?: ['service', 'bodyType'];

  @Property({ fieldName: 'price_cents', type: 'bigint' })
  declare priceCents: string;
}
