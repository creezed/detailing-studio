import type { ServiceCategoryId } from '@det/backend-catalog-domain';

export class UpdateServiceCategoryCommand {
  constructor(
    public readonly categoryId: ServiceCategoryId,
    public readonly name?: string,
    public readonly icon?: string,
    public readonly displayOrder?: number,
  ) {}
}
