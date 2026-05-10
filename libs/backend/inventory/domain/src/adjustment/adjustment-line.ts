import type { Money } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

import type { SignedQuantity } from '../value-objects/signed-quantity.value-object';

export class AdjustmentLine {
  private constructor(
    public readonly skuId: SkuId,
    public readonly delta: SignedQuantity,
    public readonly snapshotUnitCost: Money,
  ) {}

  static create(skuId: SkuId, delta: SignedQuantity, snapshotUnitCost: Money): AdjustmentLine {
    return new AdjustmentLine(skuId, delta, snapshotUnitCost);
  }
}
