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
