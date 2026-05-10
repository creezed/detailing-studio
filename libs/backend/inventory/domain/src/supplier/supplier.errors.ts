import { DomainError } from '@det/backend-shared-ddd';

import type { SupplierId } from './supplier-id';

export class SupplierAlreadyDeactivatedError extends DomainError {
  readonly code = 'SUPPLIER_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(public readonly supplierId: SupplierId) {
    super(`Supplier ${supplierId} is already deactivated`);
  }
}

export class SupplierAlreadyActiveError extends DomainError {
  readonly code = 'SUPPLIER_ALREADY_ACTIVE';
  readonly httpStatus = 409;

  constructor(public readonly supplierId: SupplierId) {
    super(`Supplier ${supplierId} is already active`);
  }
}
