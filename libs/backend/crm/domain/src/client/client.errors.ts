import { DomainError } from '@det/backend-shared-ddd';

import type { ClientId } from './client-id';
import type { VehicleId } from './vehicle-id';
import type { ConsentType } from '../value-objects/consent-type';

export class ClientAnonymizedError extends DomainError {
  readonly code = 'CLIENT_ANONYMIZED';
  readonly httpStatus = 422;

  constructor(public readonly clientId: ClientId) {
    super(`Client ${clientId} is anonymized and cannot be modified`);
  }
}

export class ClientAlreadyRegularError extends DomainError {
  readonly code = 'CLIENT_ALREADY_REGULAR';
  readonly httpStatus = 409;

  constructor(public readonly clientId: ClientId) {
    super(`Client ${clientId} is already REGULAR`);
  }
}

export class MissingMandatoryConsentError extends DomainError {
  readonly code = 'MISSING_MANDATORY_CONSENT';
  readonly httpStatus = 422;

  constructor() {
    super('PERSONAL_DATA_PROCESSING consent is mandatory');
  }
}

export class ConsentAlreadyRevokedError extends DomainError {
  readonly code = 'CONSENT_ALREADY_REVOKED';
  readonly httpStatus = 409;

  constructor(public readonly consentType: ConsentType) {
    super(`Consent ${consentType} is already revoked or was never given`);
  }
}

export class CannotRevokePersonalDataConsentError extends DomainError {
  readonly code = 'CANNOT_REVOKE_PERSONAL_DATA_CONSENT';
  readonly httpStatus = 422;

  constructor() {
    super('Cannot revoke PERSONAL_DATA_PROCESSING consent directly; use anonymize() instead');
  }
}

export class VehicleNotFoundError extends DomainError {
  readonly code = 'VEHICLE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly vehicleId: VehicleId) {
    super(`Vehicle ${vehicleId} not found`);
  }
}

export class VehicleAlreadyDeactivatedError extends DomainError {
  readonly code = 'VEHICLE_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(public readonly vehicleId: VehicleId) {
    super(`Vehicle ${vehicleId} is already deactivated`);
  }
}

export class InvalidPhoneNumberError extends DomainError {
  readonly code = 'INVALID_PHONE_NUMBER';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid phone number: ${value}. Expected format: +7XXXXXXXXXX`);
  }
}

export class InvalidEmailError extends DomainError {
  readonly code = 'INVALID_EMAIL';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid email: ${value}`);
  }
}

export class InvalidVinError extends DomainError {
  readonly code = 'INVALID_VIN';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Invalid VIN: ${value}. Must be 17 alphanumeric characters excluding I, O, Q`);
  }
}

export class InvalidFullNameError extends DomainError {
  readonly code = 'INVALID_FULL_NAME';
  readonly httpStatus = 422;

  constructor(last: string, first: string) {
    super(`Invalid full name: last="${last}", first="${first}". Both are required`);
  }
}
