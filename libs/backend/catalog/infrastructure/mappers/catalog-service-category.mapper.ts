import { ServiceCategory } from '@det/backend/catalog/domain';

import { CatalogServiceCategorySchema } from '../persistence/catalog-service-category.schema';

export function mapCatalogServiceCategoryToDomain(
  schema: CatalogServiceCategorySchema,
): ServiceCategory {
  return ServiceCategory.restore({
    displayOrder: schema.displayOrder,
    icon: schema.icon,
    id: schema.id,
    isActive: schema.isActive,
    name: schema.name,
  });
}

export function mapCatalogServiceCategoryToPersistence(
  domain: ServiceCategory,
  existing: CatalogServiceCategorySchema | null,
): CatalogServiceCategorySchema {
  const schema = existing ?? new CatalogServiceCategorySchema();
  const snapshot = domain.toSnapshot();

  schema.displayOrder = snapshot.displayOrder;
  schema.icon = snapshot.icon;
  schema.id = snapshot.id;
  schema.isActive = snapshot.isActive;
  schema.name = snapshot.name;

  return schema;
}
