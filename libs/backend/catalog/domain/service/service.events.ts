import { DomainEvent } from '@det/backend/shared/ddd';
import type { DateTime } from '@det/backend/shared/ddd';

import type { ServiceId } from './service-id';
import type { MaterialNorm } from '../shared/material-norm';
import type { ServicePricing } from '../shared/service-pricing';

const SERVICE_AGGREGATE_TYPE = 'Service';

function serviceEventProps(serviceId: ServiceId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: serviceId,
    aggregateType: SERVICE_AGGREGATE_TYPE,
    eventId: `${eventType}:${serviceId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class ServiceCreated extends DomainEvent {
  readonly eventType = 'ServiceCreated';

  constructor(
    public readonly serviceId: ServiceId,
    public readonly name: string,
    public readonly createdAt: DateTime,
  ) {
    super(serviceEventProps(serviceId, 'ServiceCreated', createdAt));
  }
}

export class ServicePriceChanged extends DomainEvent {
  readonly eventType = 'ServicePriceChanged';

  constructor(
    public readonly serviceId: ServiceId,
    public readonly newPricing: ServicePricing,
    public readonly changedAt: DateTime,
  ) {
    super(serviceEventProps(serviceId, 'ServicePriceChanged', changedAt));
  }
}

export class ServiceMaterialNormsChanged extends DomainEvent {
  readonly eventType = 'ServiceMaterialNormsChanged';

  constructor(
    public readonly serviceId: ServiceId,
    public readonly norms: readonly MaterialNorm[],
    public readonly changedAt: DateTime,
  ) {
    super(serviceEventProps(serviceId, 'ServiceMaterialNormsChanged', changedAt));
  }
}

export class ServiceDeactivated extends DomainEvent {
  readonly eventType = 'ServiceDeactivated';

  constructor(
    public readonly serviceId: ServiceId,
    public readonly deactivatedAt: DateTime,
  ) {
    super(serviceEventProps(serviceId, 'ServiceDeactivated', deactivatedAt));
  }
}
