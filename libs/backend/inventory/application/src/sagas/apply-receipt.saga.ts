import { Inject } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { BatchSourceType, ReceiptPosted } from '@det/backend-inventory-domain';
import type { IStockRepository } from '@det/backend-inventory-domain';
import { Quantity } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import type { BranchId, SupplierId } from '@det/shared-types';

import { ID_GENERATOR, IDEMPOTENCY_PORT, STOCK_REPOSITORY } from '../di/tokens';

import type { IIdempotencyPort } from '../ports/idempotency.port';

@EventsHandler(ReceiptPosted)
export class ApplyReceiptSaga implements IEventHandler<ReceiptPosted> {
  constructor(
    @Inject(STOCK_REPOSITORY) private readonly stockRepo: IStockRepository,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(IDEMPOTENCY_PORT) private readonly idempotency: IIdempotencyPort,
  ) {}

  async handle(event: ReceiptPosted): Promise<void> {
    for (const line of event.lines) {
      const key = `receipt:${event.receiptId as string}:${line.skuId as string}`;

      if (await this.idempotency.hasProcessed(key)) {
        continue;
      }

      const stock = await this.stockRepo.findOrCreate(
        line.skuId,
        event.branchId as unknown as BranchId,
        line.baseQuantity.unit,
        Quantity.of(0, line.baseQuantity.unit),
      );

      stock.receive({
        expiresAt: line.expiresAt,
        idGen: this.idGen,
        quantity: line.baseQuantity,
        receivedAt: event.postedAt,
        sourceDocId: event.receiptId,
        sourceType: BatchSourceType.RECEIPT,
        supplierId: event.supplierId as unknown as SupplierId,
        unitCost: line.unitCost,
      });

      await this.stockRepo.save(stock);
      await this.idempotency.markProcessed(key);
    }
  }
}
