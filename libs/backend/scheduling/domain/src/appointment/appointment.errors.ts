import { DomainError } from '@det/backend-shared-ddd';

import type { AppointmentStatus } from '../value-objects/appointment-status';

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly httpStatus = 409;

  constructor(
    public readonly from: AppointmentStatus,
    public readonly to: AppointmentStatus,
  ) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}

export class SlotDurationTooShortError extends DomainError {
  readonly code = 'SLOT_DURATION_TOO_SHORT';
  readonly httpStatus = 422;

  constructor(slotMinutes: number, requiredMinutes: number) {
    super(
      `Slot duration ${String(slotMinutes)} min is shorter than required ${String(requiredMinutes)} min`,
    );
  }
}

export class ServicesEmptyError extends DomainError {
  readonly code = 'SERVICES_EMPTY';
  readonly httpStatus = 422;

  constructor() {
    super('Appointment must have at least one service');
  }
}

export class NoCancellationRequestError extends DomainError {
  readonly code = 'NO_CANCELLATION_REQUEST';
  readonly httpStatus = 422;

  constructor() {
    super('No pending cancellation request exists');
  }
}

export class CancellationRequestAlreadyDecidedError extends DomainError {
  readonly code = 'CANCELLATION_REQUEST_ALREADY_DECIDED';
  readonly httpStatus = 409;

  constructor() {
    super('Cancellation request has already been decided');
  }
}
