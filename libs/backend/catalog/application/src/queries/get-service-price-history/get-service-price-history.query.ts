import type { ServiceId } from '@det/backend-catalog-domain';

export class GetServicePriceHistoryQuery {
  constructor(public readonly serviceId: ServiceId) {}
}
