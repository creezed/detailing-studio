import type { DateTime, Money, Quantity } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

export interface CreateReceiptLineProps {
  readonly id: string;
  readonly skuId: SkuId;
  readonly packagingId: string | null;
  readonly packageQuantity: number;
  readonly baseQuantity: Quantity;
  readonly unitCost: Money;
  readonly expiresAt: DateTime | null;
}

export class ReceiptLine {
  private constructor(
    public readonly id: string,
    public readonly skuId: SkuId,
    public readonly packagingId: string | null,
    public readonly packageQuantity: number,
    public readonly baseQuantity: Quantity,
    public readonly unitCost: Money,
    public readonly expiresAt: DateTime | null,
  ) {}

  static create(props: CreateReceiptLineProps): ReceiptLine {
    return new ReceiptLine(
      props.id,
      props.skuId,
      props.packagingId,
      props.packageQuantity,
      props.baseQuantity,
      props.unitCost,
      props.expiresAt,
    );
  }
}
