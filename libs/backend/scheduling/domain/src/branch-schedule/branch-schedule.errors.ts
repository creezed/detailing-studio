import { DomainError } from '@det/backend-shared-ddd';

export class DuplicateExceptionDateError extends DomainError {
  readonly code = 'DUPLICATE_EXCEPTION_DATE';
  readonly httpStatus = 409;

  constructor(public readonly date: string) {
    super(`Schedule exception already exists for date: ${date}`);
  }
}

export class ExceptionNotFoundError extends DomainError {
  readonly code = 'EXCEPTION_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly date: string) {
    super(`No schedule exception found for date: ${date}`);
  }
}
