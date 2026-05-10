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
