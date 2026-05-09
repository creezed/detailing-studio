import type { ServicePricingSnapshot } from '@det/backend-catalog-domain';

export interface PriceHistoryEntry {
  readonly id: string;
  readonly serviceId: string;
  readonly pricingType: string;
  readonly basePriceCents: string | null;
  readonly pricingSnapshot: ServicePricingSnapshot;
  readonly changedAt: Date;
}

export interface IPriceHistoryPort {
  append(entry: PriceHistoryEntry): Promise<void>;
  findByServiceId(serviceId: string): Promise<readonly PriceHistoryEntry[]>;
}
