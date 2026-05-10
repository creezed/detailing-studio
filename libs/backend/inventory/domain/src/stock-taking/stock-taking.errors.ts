import { DomainError } from '@det/backend-shared-ddd';

import type { StockTakingId } from './stock-taking-id';

export class StockTakingAlreadyPostedError extends DomainError {
  readonly code = 'STOCK_TAKING_ALREADY_POSTED';
  readonly httpStatus = 422;

  constructor(public readonly stockTakingId: StockTakingId) {
    super(`StockTaking ${stockTakingId} is already posted`);
  }
}

export class StockTakingNotStartedError extends DomainError {
  readonly code = 'STOCK_TAKING_NOT_STARTED';
  readonly httpStatus = 422;

  constructor(public readonly stockTakingId: StockTakingId) {
    super(`StockTaking ${stockTakingId} is not in STARTED status`);
  }
}

export class StockTakingSkuNotFoundError extends DomainError {
  readonly code = 'STOCK_TAKING_SKU_NOT_FOUND';
  readonly httpStatus = 422;

  constructor(public readonly skuId: string) {
    super(`SKU ${skuId} is not part of this stock taking`);
  }
}
