import { ApplicationError } from '@det/backend-shared-ddd';

export class ClientNotFoundError extends ApplicationError {
  readonly code = 'CLIENT_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(clientId: string) {
    super(`Client ${clientId} not found`);
  }
}

export class DuplicatePhoneError extends ApplicationError {
  readonly code = 'DUPLICATE_PHONE';
  readonly httpStatus = 409;

  constructor(phone: string) {
    super(`Client with phone ${phone} already exists`);
  }
}

export class MustAnonymizeError extends ApplicationError {
  readonly code = 'MUST_ANONYMIZE';
  readonly httpStatus = 422;

  constructor() {
    super(
      'Revoking PERSONAL_DATA_PROCESSING consent requires anonymization. ' +
        'Call AnonymizeClientCommand instead.',
    );
  }
}

export class AnonymizationRequestNotFoundError extends ApplicationError {
  readonly code = 'ANONYMIZATION_REQUEST_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Anonymization request ${id} not found`);
  }
}

export class AnonymizationRequestNotPendingError extends ApplicationError {
  readonly code = 'ANONYMIZATION_REQUEST_NOT_PENDING';
  readonly httpStatus = 422;

  constructor(id: string) {
    super(`Anonymization request ${id} is not in PENDING status`);
  }
}

export class DataExportNotFoundError extends ApplicationError {
  readonly code = 'DATA_EXPORT_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(exportId: string) {
    super(`Data export ${exportId} not found or expired`);
  }
}
