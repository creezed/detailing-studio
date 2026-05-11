import { DomainError } from '@det/backend-shared-ddd';

import type { WorkOrderStatus } from '../value-objects/work-order-status';

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly httpStatus = 409;

  constructor(
    public readonly from: WorkOrderStatus,
    public readonly to: WorkOrderStatus,
  ) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}

export class PhotoLimitExceededError extends DomainError {
  readonly code = 'PHOTO_LIMIT_EXCEEDED';
  readonly httpStatus = 422;

  constructor(
    public readonly photoType: string,
    public readonly limit: number,
  ) {
    super(`Photo limit of ${String(limit)} exceeded for type ${photoType}`);
  }
}

export class ConsumptionLineNotFoundError extends DomainError {
  readonly code = 'CONSUMPTION_LINE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly lineId: string) {
    super(`Consumption line ${lineId} not found`);
  }
}

export class AppointmentAlreadyHasWorkOrderError extends DomainError {
  readonly code = 'APPOINTMENT_ALREADY_HAS_WORK_ORDER';
  readonly httpStatus = 409;

  constructor(public readonly appointmentId: string) {
    super(`Appointment ${appointmentId} already has a work order`);
  }
}

export class ServicesEmptyError extends DomainError {
  readonly code = 'SERVICES_EMPTY';
  readonly httpStatus = 422;

  constructor() {
    super('Work order must have at least one service');
  }
}

export class InvalidOperationError extends DomainError {
  readonly code = 'INVALID_OPERATION';
  readonly httpStatus = 422;

  constructor(public readonly detail: string) {
    super(detail);
  }
}
