import type { ServiceCategoryId, MaterialNorm, ServicePricing } from '@det/backend-catalog-domain';

export class CreateServiceCommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly categoryId: ServiceCategoryId,
    public readonly durationMinutes: number,
    public readonly pricing: ServicePricing,
    public readonly materialNorms: readonly MaterialNorm[],
    public readonly displayOrder: number,
  ) {}
}
