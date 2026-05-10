import type { Quantity } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

import { SignedQuantity } from '../value-objects/signed-quantity.value-object';

export class StockTakingLine {
  private constructor(
    public readonly skuId: SkuId,
    public readonly expectedQuantity: Quantity,
    private _actualQuantity: Quantity | null,
  ) {}

  static create(skuId: SkuId, expectedQuantity: Quantity): StockTakingLine {
    return new StockTakingLine(skuId, expectedQuantity, null);
  }

  static restore(
    skuId: SkuId,
    expectedQuantity: Quantity,
    actualQuantity: Quantity | null,
  ): StockTakingLine {
    return new StockTakingLine(skuId, expectedQuantity, actualQuantity);
  }

  get actualQuantity(): Quantity | null {
    return this._actualQuantity;
  }

  get isMeasured(): boolean {
    return this._actualQuantity !== null;
  }

  recordActual(actual: Quantity): void {
    this._actualQuantity = actual;
  }

  computeDelta(): SignedQuantity | null {
    if (this._actualQuantity === null) {
      return null;
    }

    return SignedQuantity.of(
      this._actualQuantity.amount - this.expectedQuantity.amount,
      this.expectedQuantity.unit,
    );
  }
}
