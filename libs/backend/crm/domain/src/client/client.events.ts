import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { ClientId } from './client-id';
import type { VehicleId } from './vehicle-id';
import type { ClientType } from '../value-objects/client-type';
import type { ConsentType } from '../value-objects/consent-type';
import type { PolicyVersion } from '../value-objects/policy-version';

const CLIENT_AGGREGATE_TYPE = 'Client';

function clientEventProps(clientId: ClientId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: clientId,
    aggregateType: CLIENT_AGGREGATE_TYPE,
    eventId: `${eventType}:${clientId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class ClientRegistered extends DomainEvent {
  readonly eventType = 'ClientRegistered';

  constructor(
    public readonly clientId: ClientId,
    public readonly clientType: ClientType,
    public readonly registeredAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientRegistered', registeredAt));
  }
}

export class ClientUpgradedToRegular extends DomainEvent {
  readonly eventType = 'ClientUpgradedToRegular';

  constructor(
    public readonly clientId: ClientId,
    public readonly upgradedAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientUpgradedToRegular', upgradedAt));
  }
}

export class ClientProfileUpdated extends DomainEvent {
  readonly eventType = 'ClientProfileUpdated';

  constructor(
    public readonly clientId: ClientId,
    public readonly updatedAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientProfileUpdated', updatedAt));
  }
}

export class ClientConsentGiven extends DomainEvent {
  readonly eventType = 'ClientConsentGiven';

  constructor(
    public readonly clientId: ClientId,
    public readonly consentType: ConsentType,
    public readonly policyVersion: PolicyVersion,
    public readonly givenAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientConsentGiven', givenAt));
  }
}

export class ClientConsentRevoked extends DomainEvent {
  readonly eventType = 'ClientConsentRevoked';

  constructor(
    public readonly clientId: ClientId,
    public readonly consentType: ConsentType,
    public readonly revokedAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientConsentRevoked', revokedAt));
  }
}

export class ClientVehicleAdded extends DomainEvent {
  readonly eventType = 'ClientVehicleAdded';

  constructor(
    public readonly clientId: ClientId,
    public readonly vehicleId: VehicleId,
    public readonly addedAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientVehicleAdded', addedAt));
  }
}

export class ClientVehicleUpdated extends DomainEvent {
  readonly eventType = 'ClientVehicleUpdated';

  constructor(
    public readonly clientId: ClientId,
    public readonly vehicleId: VehicleId,
    public readonly updatedAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientVehicleUpdated', updatedAt));
  }
}

export class ClientVehicleDeactivated extends DomainEvent {
  readonly eventType = 'ClientVehicleDeactivated';

  constructor(
    public readonly clientId: ClientId,
    public readonly vehicleId: VehicleId,
    public readonly deactivatedAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientVehicleDeactivated', deactivatedAt));
  }
}

export class ClientAnonymized extends DomainEvent {
  readonly eventType = 'ClientAnonymized';

  constructor(
    public readonly clientId: ClientId,
    public readonly anonymizedBy: string,
    public readonly reason: string,
    public readonly anonymizedAt: DateTime,
  ) {
    super(clientEventProps(clientId, 'ClientAnonymized', anonymizedAt));
  }
}
