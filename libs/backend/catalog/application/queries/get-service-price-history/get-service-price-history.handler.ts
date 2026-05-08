import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { IServiceRepository, ServicePricingSnapshot } from '@det/backend/catalog/domain';

import { GetServicePriceHistoryQuery } from './get-service-price-history.query';
import { SERVICE_REPOSITORY } from '../../di/tokens';
import { ServiceNotFoundError } from '../../errors/application.errors';

export interface ServicePriceHistoryDto {
  readonly serviceId: string;
  readonly currentPricing: ServicePricingSnapshot;
  readonly version: number;
}

@QueryHandler(GetServicePriceHistoryQuery)
export class GetServicePriceHistoryHandler implements IQueryHandler<
  GetServicePriceHistoryQuery,
  ServicePriceHistoryDto
> {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository) {}

  async execute(query: GetServicePriceHistoryQuery): Promise<ServicePriceHistoryDto> {
    const service = await this.repo.findById(query.serviceId);

    if (!service) {
      throw new ServiceNotFoundError(query.serviceId);
    }

    const snapshot = service.toSnapshot();

    return {
      currentPricing: snapshot.pricing,
      serviceId: snapshot.id,
      version: snapshot.version,
    };
  }
}
