import type { ClientId, VehicleId } from '@det/shared-types';

export type VehicleBodyType =
  | 'SEDAN'
  | 'HATCHBACK'
  | 'CROSSOVER'
  | 'SUV'
  | 'MINIVAN'
  | 'PICKUP'
  | 'COUPE'
  | 'OTHER';

export interface CrmVehicleReadModel {
  readonly id: VehicleId;
  readonly clientId: ClientId;
  readonly bodyType: VehicleBodyType;
  readonly isActive: boolean;
}

export interface ICrmVehiclePort {
  getOrThrow(clientId: ClientId, vehicleId: VehicleId): Promise<CrmVehicleReadModel>;
}
