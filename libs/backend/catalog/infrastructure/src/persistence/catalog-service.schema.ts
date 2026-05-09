import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { CatalogMaterialNormSchema } from './catalog-material-norm.schema';
import { CatalogServiceCategorySchema } from './catalog-service-category.schema';
import { CatalogServicePricingSchema } from './catalog-service-pricing.schema';

@Entity({ tableName: 'catalog_service' })
export class CatalogServiceSchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @ManyToOne(() => CatalogServiceCategorySchema, {
    fieldName: 'category_id',
    referenceColumnName: 'id',
    nullable: false,
  })
  declare category: CatalogServiceCategorySchema;

  @Property({ fieldName: 'category_id', persist: false, type: 'uuid' })
  declare categoryId: string;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ fieldName: 'description_md', type: 'text' })
  declare descriptionMd: string;

  @Property({ fieldName: 'duration_minutes', type: 'int' })
  declare durationMinutes: number;

  @Property({ fieldName: 'pricing_type', type: 'text' })
  declare pricingType: string;

  @Property({ fieldName: 'base_price_cents', type: 'bigint', nullable: true })
  declare basePriceCents: string | null;

  @Property({ fieldName: 'is_active', type: 'boolean' })
  declare isActive: boolean;

  @Property({ fieldName: 'display_order', type: 'int' })
  declare displayOrder: number;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;

  @Property({ version: true })
  declare version: number;

  @OneToMany(() => CatalogServicePricingSchema, (p) => p.service, {
    orphanRemoval: true,
    eager: true,
  })
  pricingEntries = new Collection<CatalogServicePricingSchema>(this);

  @OneToMany(() => CatalogMaterialNormSchema, (n) => n.service, {
    orphanRemoval: true,
    eager: true,
  })
  materialNorms = new Collection<CatalogMaterialNormSchema>(this);
}
