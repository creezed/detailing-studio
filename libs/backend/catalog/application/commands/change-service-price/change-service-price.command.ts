import type { ServiceId, ServicePricing } from '@det/backend/catalog/domain';

export class ChangeServicePriceCommand {
  constructor(
    public readonly serviceId: ServiceId,
    public readonly newPricing: ServicePricing,
  ) {}
}
