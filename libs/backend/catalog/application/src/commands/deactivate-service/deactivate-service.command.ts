import type { ServiceId } from '@det/backend-catalog-domain';

export class DeactivateServiceCommand {
  constructor(public readonly serviceId: ServiceId) {}
}
