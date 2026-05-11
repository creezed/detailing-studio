import type { Money } from '@det/backend-shared-ddd';
import type { ServiceId } from '@det/shared-types';

import type { VehicleBodyType } from './crm-vehicle.port';

export type CatalogServicePricingReadModel =
  | {
      readonly type: 'FIXED';
      readonly price: Money;
    }
  | {
      readonly type: 'BY_BODY_TYPE';
      readonly prices: ReadonlyArray<{
        readonly bodyType: VehicleBodyType;
        readonly price: Money;
      }>;
    };

export interface CatalogServiceReadModel {
  readonly id: ServiceId;
  readonly name: string;
  readonly durationMinutes: number;
  readonly pricing: CatalogServicePricingReadModel;
  readonly isActive: boolean;
}

export interface ICatalogServicePort {
  getMany(serviceIds: readonly ServiceId[]): Promise<readonly CatalogServiceReadModel[]>;
}
