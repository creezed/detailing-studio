import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { CatalogServiceSchema } from './catalog-service.schema';

@Entity({ tableName: 'catalog_material_norm' })
export class CatalogMaterialNormSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => CatalogServiceSchema, {
    fieldName: 'service_id',
    referenceColumnName: 'id',
  })
  declare service: CatalogServiceSchema;

  @Property({ fieldName: 'sku_id', type: 'uuid' })
  declare skuId: string;

  @Property({ type: 'numeric' })
  declare amount: number;

  @Property({ type: 'text' })
  declare unit: string;

  @Property({ fieldName: 'body_type_coefficients', nullable: true, type: 'jsonb' })
  declare bodyTypeCoefficients: Record<string, number> | null;
}
