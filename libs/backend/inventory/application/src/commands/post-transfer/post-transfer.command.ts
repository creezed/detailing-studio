import type { TransferId } from '@det/backend-inventory-domain';
import type { UserId } from '@det/shared-types';

export class PostTransferCommand {
  constructor(
    public readonly transferId: TransferId,
    public readonly postedBy: UserId,
  ) {}
}
