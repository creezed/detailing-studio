import { DomainError } from '@det/backend/shared/ddd';

export class ServiceCategoryAlreadyDeactivatedError extends DomainError {
  readonly code = 'SERVICE_CATEGORY_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(categoryId: string) {
    super(`ServiceCategory ${categoryId} is already deactivated`);
  }
}

export class InvalidServiceCategoryNameError extends DomainError {
  readonly code = 'INVALID_SERVICE_CATEGORY_NAME';
  readonly httpStatus = 422;

  constructor() {
    super('ServiceCategory name must not be empty');
  }
}

export class InvalidServiceCategoryIconError extends DomainError {
  readonly code = 'INVALID_SERVICE_CATEGORY_ICON';
  readonly httpStatus = 422;

  constructor() {
    super('ServiceCategory icon must not be empty');
  }
}
