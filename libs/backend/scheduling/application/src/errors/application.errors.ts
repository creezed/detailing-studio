import { ApplicationError } from '@det/backend-shared-ddd';

export class BranchNotFoundError extends ApplicationError {
  readonly code = 'BRANCH_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Branch ${id} not found`);
  }
}

export class BayNotFoundError extends ApplicationError {
  readonly code = 'BAY_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Bay ${id} not found`);
  }
}

export class BranchScheduleNotFoundError extends ApplicationError {
  readonly code = 'BRANCH_SCHEDULE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(branchId: string) {
    super(`BranchSchedule for Branch ${branchId} not found`);
  }
}

export class MasterScheduleNotFoundError extends ApplicationError {
  readonly code = 'MASTER_SCHEDULE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(masterId: string, branchId: string) {
    super(`MasterSchedule for Master ${masterId} and Branch ${branchId} not found`);
  }
}

export class BayInUseError extends ApplicationError {
  readonly code = 'BAY_IN_USE';
  readonly httpStatus = 409;

  constructor(id: string) {
    super(`Bay ${id} is used by future Appointment`);
  }
}

export class MasterScheduleOutsideBranchHoursError extends ApplicationError {
  readonly code = 'MASTER_SCHEDULE_OUTSIDE_BRANCH_HOURS';
  readonly httpStatus = 422;

  constructor(masterId: string, branchId: string) {
    super(`MasterSchedule for Master ${masterId} is outside Branch ${branchId} working hours`);
  }
}

export class IamUserNotFoundError extends ApplicationError {
  readonly code = 'IAM_USER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(userId: string) {
    super(`IAM User ${userId} not found`);
  }
}

export class AppointmentNotFoundError extends ApplicationError {
  readonly code = 'APPOINTMENT_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Appointment ${id} not found`);
  }
}

export class ServiceInactiveError extends ApplicationError {
  readonly code = 'SERVICE_INACTIVE';
  readonly httpStatus = 422;

  constructor(serviceId: string) {
    super(`Service ${serviceId} is inactive`);
  }
}

export class ServiceNotFoundError extends ApplicationError {
  readonly code = 'SERVICE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(serviceId: string) {
    super(`Service ${serviceId} not found`);
  }
}

export class ServicePriceUnavailableError extends ApplicationError {
  readonly code = 'SERVICE_PRICE_UNAVAILABLE';
  readonly httpStatus = 422;

  constructor(serviceId: string, bodyType: string) {
    super(`Service ${serviceId} has no price for BodyType ${bodyType}`);
  }
}

export class VehicleInactiveError extends ApplicationError {
  readonly code = 'VEHICLE_INACTIVE';
  readonly httpStatus = 422;

  constructor(vehicleId: string) {
    super(`Vehicle ${vehicleId} is inactive`);
  }
}

export class VehicleNotFoundError extends ApplicationError {
  readonly code = 'VEHICLE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(vehicleId: string) {
    super(`Vehicle ${vehicleId} not found`);
  }
}

export class SlotConflictError extends ApplicationError {
  readonly code = 'SLOT_CONFLICT';
  readonly httpStatus = 409;

  constructor() {
    super('Slot is no longer available');
  }
}

export class AppointmentDomainRuleViolationError extends ApplicationError {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}
