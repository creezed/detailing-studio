import type { ServiceCategoryId } from '@det/backend/catalog/domain';

export class DeactivateServiceCategoryCommand {
  constructor(public readonly categoryId: ServiceCategoryId) {}
}
