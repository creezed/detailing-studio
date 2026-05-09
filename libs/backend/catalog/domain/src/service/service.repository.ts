import type { ServiceId } from './service-id';
import type { Service } from './service.aggregate';
import type { ServiceCategoryId } from '../service-category/service-category-id';

export interface IServiceRepository {
  findById(id: ServiceId): Promise<Service | null>;
  findAll(filters: { categoryId?: ServiceCategoryId; isActive?: boolean }): Promise<Service[]>;
  save(service: Service): Promise<void>;
}
