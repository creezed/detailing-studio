import type { ServiceCategoryId } from './service-category-id';
import type { ServiceCategory } from './service-category.aggregate';

export interface IServiceCategoryRepository {
  findById(id: ServiceCategoryId): Promise<ServiceCategory | null>;
  findAll(includeInactive: boolean): Promise<ServiceCategory[]>;
  save(category: ServiceCategory): Promise<void>;
}
