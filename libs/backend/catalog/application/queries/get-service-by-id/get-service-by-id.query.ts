import type { ServiceId } from '@det/backend/catalog/domain';

export class GetServiceByIdQuery {
  constructor(public readonly serviceId: ServiceId) {}
}
