import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import {
  GetServiceByIdQuery,
  PricingType,
  ServiceNotFoundError as CatalogServiceNotFoundError,
  type ServiceDto,
} from '@det/backend-catalog-application';
import type {
  CatalogServicePricingReadModel,
  CatalogServiceReadModel,
  ICatalogServicePort,
  VehicleBodyType,
} from '@det/backend-scheduling-application';
import { ServicePriceUnavailableError } from '@det/backend-scheduling-application';
import { Money } from '@det/backend-shared-ddd';
import { ServiceId } from '@det/shared-types';

@Injectable()
export class CatalogServicePortAdapter implements ICatalogServicePort {
  constructor(private readonly queryBus: QueryBus) {}

  async getMany(serviceIds: readonly ServiceId[]): Promise<readonly CatalogServiceReadModel[]> {
    const services: CatalogServiceReadModel[] = [];

    for (const serviceId of serviceIds) {
      const service = await this.getService(serviceId);
      if (service !== null) {
        services.push(service);
      }
    }

    return services;
  }

  private async getService(serviceId: ServiceId): Promise<CatalogServiceReadModel | null> {
    try {
      const service = await this.queryBus.execute<GetServiceByIdQuery, ServiceDto>(
        new GetServiceByIdQuery(serviceId),
      );

      return {
        durationMinutes: service.durationMinutes,
        id: ServiceId.from(service.id),
        isActive: service.isActive,
        name: service.name,
        pricing: this.toPricingReadModel(service),
      };
    } catch (error) {
      if (error instanceof CatalogServiceNotFoundError) {
        return null;
      }

      throw error;
    }
  }

  private toPricingReadModel(service: ServiceDto): CatalogServicePricingReadModel {
    if (service.pricing.type === PricingType.FIXED) {
      const cents = service.pricing.fixedPriceCents;
      if (cents === undefined) {
        throw new ServicePriceUnavailableError(service.id, 'FIXED');
      }

      return { price: moneyFromCents(cents), type: 'FIXED' };
    }

    return {
      prices: (service.pricing.bodyTypePrices ?? []).map((entry) => ({
        bodyType: toVehicleBodyType(entry.bodyType),
        price: moneyFromCents(entry.priceCents),
      })),
      type: 'BY_BODY_TYPE',
    };
  }
}

function moneyFromCents(cents: string): Money {
  const value = BigInt(cents);
  const rubles = value / 100n;
  const centsPart = (value % 100n).toString().padStart(2, '0');

  return Money.rub(`${rubles.toString()}.${centsPart}`);
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
