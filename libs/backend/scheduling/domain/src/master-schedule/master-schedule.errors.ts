import { DomainError } from '@det/backend-shared-ddd';

import type { UnavailabilityId } from '../value-objects/unavailability-id';

export class UnavailabilityOverlapsError extends DomainError {
  readonly code = 'UNAVAILABILITY_OVERLAPS';
  readonly httpStatus = 409;

  constructor() {
    super('New unavailability period overlaps with an existing one');
  }
}

export class UnavailabilityNotFoundError extends DomainError {
  readonly code = 'UNAVAILABILITY_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly unavailabilityId: UnavailabilityId) {
    super(`Unavailability not found: ${unavailabilityId}`);
  }
}
