import type { Quantity } from '@det/backend-shared-ddd';

export interface MaterialNormSnapshot {
  readonly skuId: string;
  readonly skuNameSnapshot: string;
  readonly normAmount: Quantity;
}
