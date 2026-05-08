import type { ServiceCategoryId } from '@det/backend/catalog/domain';

export class ListServicesQuery {
  constructor(
    public readonly categoryId?: ServiceCategoryId,
    public readonly isActive?: boolean,
  ) {}
}
