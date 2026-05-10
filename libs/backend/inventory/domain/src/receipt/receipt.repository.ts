import type { ReceiptId } from './receipt-id';
import type { Receipt } from './receipt.aggregate';

export interface IReceiptRepository {
  findById(id: ReceiptId): Promise<Receipt | null>;
  save(receipt: Receipt): Promise<void>;
}
