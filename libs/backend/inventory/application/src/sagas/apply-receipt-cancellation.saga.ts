import { Inject } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { ReceiptCancelled } from '@det/backend-inventory-domain';
import type { IReceiptRepository, IStockRepository } from '@det/backend-inventory-domain';

import { IDEMPOTENCY_PORT, RECEIPT_REPOSITORY, STOCK_REPOSITORY } from '../di/tokens';

import type { IIdempotencyPort } from '../ports/idempotency.port';

@EventsHandler(ReceiptCancelled)
export class ApplyReceiptCancellationSaga implements IEventHandler<ReceiptCancelled> {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receiptRepo: IReceiptRepository,
    @Inject(STOCK_REPOSITORY) private readonly stockRepo: IStockRepository,
    @Inject(IDEMPOTENCY_PORT) private readonly idempotency: IIdempotencyPort,
  ) {}

  async handle(event: ReceiptCancelled): Promise<void> {
    const key = `receipt-cancel:${event.receiptId as string}`;

    if (await this.idempotency.hasProcessed(key)) {
      return;
    }

    const receipt = await this.receiptRepo.findById(event.receiptId);

    if (!receipt) {
      return;
    }

    for (const line of receipt.lines) {
      const stock = await this.stockRepo.findByCompositeId(line.skuId, receipt.branchId);

      if (!stock) {
        continue;
      }

      stock.removeBatchesBySourceDoc(event.receiptId);

      await this.stockRepo.save(stock);
    }

    await this.idempotency.markProcessed(key);
  }
}
