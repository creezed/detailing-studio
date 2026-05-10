import type { ReceiptId } from '@det/backend-inventory-domain';

export class CancelReceiptCommand {
  constructor(
    public readonly receiptId: ReceiptId,
    public readonly reason: string,
  ) {}
}
