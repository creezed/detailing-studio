import { DomainError } from '@det/backend-shared-ddd';

import type { SkuId } from './sku-id';

export class SkuAlreadyDeactivatedError extends DomainError {
  readonly code = 'SKU_ALREADY_DEACTIVATED';
  readonly httpStatus = 409;

  constructor(public readonly skuId: SkuId) {
    super(`Sku ${skuId} is already deactivated`);
  }
}

export class SkuAlreadyActiveError extends DomainError {
  readonly code = 'SKU_ALREADY_ACTIVE';
  readonly httpStatus = 409;

  constructor(public readonly skuId: SkuId) {
    super(`Sku ${skuId} is already active`);
  }
}
