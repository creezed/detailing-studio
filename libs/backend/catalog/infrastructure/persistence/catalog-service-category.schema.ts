import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'catalog_service_category' })
export class CatalogServiceCategorySchema {
  @PrimaryKey({ type: 'uuid' })
  declare id: string;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ type: 'text' })
  declare icon: string;

  @Property({ fieldName: 'display_order', type: 'int' })
  declare displayOrder: number;

  @Property({ fieldName: 'is_active', type: 'boolean' })
  declare isActive: boolean;
}
