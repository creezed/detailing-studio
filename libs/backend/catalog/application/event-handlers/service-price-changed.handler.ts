import { Inject } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { PricingType, ServicePriceChanged } from '@det/backend/catalog/domain';
import type { IIdGenerator } from '@det/backend/shared/ddd';

import { ID_GENERATOR, PRICE_HISTORY_PORT } from '../di/tokens';

import type { IPriceHistoryPort } from '../ports/price-history.port';

@EventsHandler(ServicePriceChanged)
export class ServicePriceChangedHandler implements IEventHandler<ServicePriceChanged> {
  constructor(
    @Inject(PRICE_HISTORY_PORT) private readonly priceHistory: IPriceHistoryPort,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async handle(event: ServicePriceChanged): Promise<void> {
    const pricingSnapshot = toSerializableSnapshot(event);

    await this.priceHistory.append({
      basePriceCents: pricingSnapshot.fixedPriceCents ?? null,
      changedAt: event.occurredAt,
      id: this.idGen.generate(),
      pricingSnapshot,
      pricingType: pricingSnapshot.type,
      serviceId: event.serviceId,
    });
  }
}

function toSerializableSnapshot(event: ServicePriceChanged) {
  const pricing = event.newPricing;

  if ('price' in pricing) {
    return {
      fixedPriceCents: pricing.price.cents.toString(),
      type: PricingType.FIXED,
    };
  }

  const bodyTypePrices = [...pricing.prices.entries()].map(([bt, money]) => ({
    bodyType: bt,
    priceCents: money.cents.toString(),
  }));

  return {
    bodyTypePrices,
    type: PricingType.BY_BODY_TYPE,
  };
}
