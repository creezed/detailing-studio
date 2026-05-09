import { ApplicationError } from '@det/backend-shared-ddd';

export class ServiceCategoryNotFoundError extends ApplicationError {
  readonly code = 'SERVICE_CATEGORY_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(categoryId: string) {
    super(`ServiceCategory ${categoryId} not found`);
  }
}

export class ServiceNotFoundError extends ApplicationError {
  readonly code = 'SERVICE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(serviceId: string) {
    super(`Service ${serviceId} not found`);
  }
}
