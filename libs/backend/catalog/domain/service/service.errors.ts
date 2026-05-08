import { DomainError } from '@det/backend/shared/ddd';

export class InvalidDurationError extends DomainError {
  readonly code = 'INVALID_DURATION';
  readonly httpStatus = 422;

  constructor(public readonly durationMinutes: number) {
    super(`Duration must be > 0 and a multiple of 15 minutes, got ${String(durationMinutes)}`);
  }
}

export class InvalidPricingError extends DomainError {
  readonly code = 'INVALID_PRICING';
  readonly httpStatus = 422;

  constructor(public readonly detail: string) {
    super(detail);
  }
}

export class ServiceAlreadyDeactivatedError extends DomainError {
  readonly code = 'SERVICE_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(serviceId: string) {
    super(`Service ${serviceId} is already deactivated`);
  }
}
