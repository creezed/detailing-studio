import type { ReceiptId } from '@det/backend-inventory-domain';
import type { DateTime, Money, Quantity } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

export interface ReceiptLineInput {
  readonly id: string;
  readonly skuId: SkuId;
  readonly packagingId: string | null;
  readonly packageQuantity: number;
  readonly baseQuantity: Quantity;
  readonly unitCost: Money;
  readonly expiresAt: DateTime | null;
}

export class UpdateReceiptCommand {
  constructor(
    public readonly receiptId: ReceiptId,
    public readonly lines: readonly ReceiptLineInput[],
  ) {}
}
