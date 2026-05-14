import { ApplicationError } from '@det/backend-shared-ddd';

export class SubscriptionNotFoundError extends ApplicationError {
  readonly code = 'SUBSCRIPTION_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Subscription not found for ${id}`);
  }
}

export class TenantAlreadyHasSubscriptionError extends ApplicationError {
  readonly code = 'TENANT_ALREADY_HAS_SUBSCRIPTION';
  readonly httpStatus = 409;

  constructor(tenantId: string) {
    super(`Tenant ${tenantId} already has a subscription`);
  }
}

export class InvoiceNotFoundError extends ApplicationError {
  readonly code = 'INVOICE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(id: string) {
    super(`Invoice ${id} not found`);
  }
}
