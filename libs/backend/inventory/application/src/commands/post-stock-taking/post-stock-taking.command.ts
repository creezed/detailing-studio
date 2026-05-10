import type { StockTakingId } from '@det/backend-inventory-domain';
import type { UserId } from '@det/shared-types';

export class PostStockTakingCommand {
  constructor(
    public readonly stockTakingId: StockTakingId,
    public readonly postedBy: UserId,
  ) {}
}
