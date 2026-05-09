import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { IServiceRepository, ServicePricingSnapshot } from '@det/backend-catalog-domain';

import { GetServicePriceHistoryQuery } from './get-service-price-history.query';
import { PRICE_HISTORY_PORT, SERVICE_REPOSITORY } from '../../di/tokens';
import { ServiceNotFoundError } from '../../errors/application.errors';

import type { IPriceHistoryPort, PriceHistoryEntry } from '../../ports/price-history.port';

export interface ServicePriceHistoryEntryDto {
  readonly pricingType: string;
  readonly basePriceCents: string | null;
  readonly pricingSnapshot: ServicePricingSnapshot;
  readonly changedAt: string;
}

export interface ServicePriceHistoryDto {
  readonly serviceId: string;
  readonly currentPricing: ServicePricingSnapshot;
  readonly history: readonly ServicePriceHistoryEntryDto[];
}

@QueryHandler(GetServicePriceHistoryQuery)
export class GetServicePriceHistoryHandler implements IQueryHandler<
  GetServicePriceHistoryQuery,
  ServicePriceHistoryDto
> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository,
    @Inject(PRICE_HISTORY_PORT) private readonly priceHistory: IPriceHistoryPort,
  ) {}

  async execute(query: GetServicePriceHistoryQuery): Promise<ServicePriceHistoryDto> {
    const service = await this.repo.findById(query.serviceId);

    if (!service) {
      throw new ServiceNotFoundError(query.serviceId);
    }

    const snapshot = service.toSnapshot();
    const entries = await this.priceHistory.findByServiceId(query.serviceId);

    return {
      currentPricing: snapshot.pricing,
      history: entries.map(toEntryDto),
      serviceId: snapshot.id,
    };
  }
}

function toEntryDto(entry: PriceHistoryEntry): ServicePriceHistoryEntryDto {
  return {
    basePriceCents: entry.basePriceCents,
    changedAt: entry.changedAt.toISOString(),
    pricingSnapshot: entry.pricingSnapshot,
    pricingType: entry.pricingType,
  };
}
