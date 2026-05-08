import { DomainError } from '@det/backend/shared/ddd';

export class ServiceCategoryAlreadyDeactivatedError extends DomainError {
  readonly code = 'SERVICE_CATEGORY_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(categoryId: string) {
    super(`ServiceCategory ${categoryId} is already deactivated`);
  }
}
