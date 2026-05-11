import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import {
  ClientNotFoundError,
  GetClientVehiclesQuery,
  type VehicleReadModel,
} from '@det/backend-crm-application';
import { VehicleNotFoundError } from '@det/backend-scheduling-application';
import type {
  CrmVehicleReadModel,
  ICrmVehiclePort,
  VehicleBodyType,
} from '@det/backend-scheduling-application';
import { ClientId, VehicleId } from '@det/shared-types';

@Injectable()
export class CrmVehiclePortAdapter implements ICrmVehiclePort {
  constructor(private readonly queryBus: QueryBus) {}

  async getOrThrow(clientId: ClientId, vehicleId: VehicleId): Promise<CrmVehicleReadModel> {
    try {
      const vehicles = await this.queryBus.execute<
        GetClientVehiclesQuery,
        readonly VehicleReadModel[]
      >(new GetClientVehiclesQuery(clientId));
      const vehicle = vehicles.find((item) => item.id === vehicleId);

      if (vehicle === undefined) {
        throw new VehicleNotFoundError(vehicleId);
      }

      return {
        bodyType: toVehicleBodyType(vehicle.bodyType),
        clientId: ClientId.from(clientId),
        id: VehicleId.from(vehicle.id),
        isActive: vehicle.isActive,
      };
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        throw new VehicleNotFoundError(vehicleId);
      }

      throw error;
    }
  }
}

function toVehicleBodyType(value: string): VehicleBodyType {
  switch (value) {
    case 'SEDAN':
      return 'SEDAN';
    case 'HATCHBACK':
      return 'HATCHBACK';
    case 'CROSSOVER':
      return 'CROSSOVER';
    case 'SUV':
      return 'SUV';
    case 'MINIVAN':
      return 'MINIVAN';
    case 'PICKUP':
      return 'PICKUP';
    case 'COUPE':
      return 'COUPE';
    default:
      return 'OTHER';
  }
}
