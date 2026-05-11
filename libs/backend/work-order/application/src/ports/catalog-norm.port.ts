import type { MaterialNormSnapshot } from '@det/backend-work-order-domain';

export interface ICatalogNormPort {
  getNormsForServices(
    serviceIds: readonly string[],
    vehicleBodyType?: string,
  ): Promise<MaterialNormSnapshot[]>;
}
