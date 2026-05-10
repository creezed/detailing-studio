import type { StockTakingId } from '@det/backend-inventory-domain';

export class CancelStockTakingCommand {
  constructor(public readonly stockTakingId: StockTakingId) {}
}
