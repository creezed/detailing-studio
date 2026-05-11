import { ApplicationError, DomainError, err } from '@det/backend-shared-ddd';
import type { Result } from '@det/backend-shared-ddd';

import { AppointmentDomainRuleViolationError } from '../errors/application.errors';

export type AppointmentCommandResult<T> = Result<T, ApplicationError>;

export function domainErrorResult<T>(error: DomainError): AppointmentCommandResult<T> {
  return err(new AppointmentDomainRuleViolationError(error.code, error.httpStatus, error.message));
}

export function applicationErrorResult<T>(error: ApplicationError): AppointmentCommandResult<T> {
  return err(error);
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
