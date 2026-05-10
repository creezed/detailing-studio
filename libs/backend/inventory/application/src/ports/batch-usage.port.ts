import type { ReceiptId } from '@det/backend-inventory-domain';

export interface IBatchUsagePort {
  areBatchesUntouched(receiptId: ReceiptId): Promise<boolean>;
}
