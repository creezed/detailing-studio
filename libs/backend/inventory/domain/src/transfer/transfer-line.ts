import type { Quantity } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

export class TransferLine {
  private constructor(
    public readonly skuId: SkuId,
    public readonly quantity: Quantity,
  ) {}

  static create(skuId: SkuId, quantity: Quantity): TransferLine {
    return new TransferLine(skuId, quantity);
  }
}
