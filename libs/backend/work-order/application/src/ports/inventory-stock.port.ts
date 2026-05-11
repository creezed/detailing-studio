import type { Quantity } from '@det/backend-shared-ddd';

export interface ConsumeStockInput {
  readonly skuId: string;
  readonly branchId: string;
  readonly amount: Quantity;
  readonly reason: string;
  readonly sourceType: string;
  readonly sourceDocId: string;
  readonly sourceLineId: string;
  readonly idempotencyKey: string;
}

export interface CompensateStockInput {
  readonly sourceType: string;
  readonly sourceDocId: string;
  readonly sourceLineId: string;
  readonly idempotencyKey: string;
}

export interface ConsumeStockResult {
  readonly ok: boolean;
  readonly error?: string;
}

export interface IInventoryStockPort {
  getCurrentQuantity(branchId: string, skuId: string): Promise<Quantity | null>;
  canConsume(skuId: string, branchId: string, amount: Quantity): Promise<boolean>;
  consume(input: ConsumeStockInput): Promise<ConsumeStockResult>;
  compensate(input: CompensateStockInput): Promise<void>;
}
