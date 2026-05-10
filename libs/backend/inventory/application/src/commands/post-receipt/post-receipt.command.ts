import type { ReceiptId } from '@det/backend-inventory-domain';
import type { UserId } from '@det/shared-types';

export class PostReceiptCommand {
  constructor(
    public readonly receiptId: ReceiptId,
    public readonly postedBy: UserId,
  ) {}
}
