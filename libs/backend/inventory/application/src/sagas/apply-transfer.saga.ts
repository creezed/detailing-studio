import { Inject } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { TransferPosted } from '@det/backend-inventory-domain';
import type { IBatchSelector, IStockRepository } from '@det/backend-inventory-domain';
import { Quantity } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import { BATCH_SELECTOR, ID_GENERATOR, IDEMPOTENCY_PORT, STOCK_REPOSITORY } from '../di/tokens';

import type { IIdempotencyPort } from '../ports/idempotency.port';

/**
 * Multi-aggregate transaction: transferOut + transferIn affect two Stock aggregates
 * in the same handler call. This is an explicit exception to the "one aggregate = one transaction"
 * rule. See ADR-0010 for rationale: totalSystemQuantity invariant must hold atomically,
 * and eventual consistency would leave a window where stock is "lost".
 */
@EventsHandler(TransferPosted)
export class ApplyTransferSaga implements IEventHandler<TransferPosted> {
  constructor(
    @Inject(STOCK_REPOSITORY) private readonly stockRepo: IStockRepository,
    @Inject(BATCH_SELECTOR) private readonly batchSelector: IBatchSelector,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(IDEMPOTENCY_PORT) private readonly idempotency: IIdempotencyPort,
  ) {}

  async handle(event: TransferPosted): Promise<void> {
    const key = `transfer:${event.transferId as string}`;

    if (await this.idempotency.hasProcessed(key)) return;

    for (const line of event.lines) {
      const fromStock = await this.stockRepo.findOrCreate(
        line.skuId,
        event.fromBranchId,
        line.quantity.unit,
        Quantity.of(0, line.quantity.unit),
      );

      const transferDetails = fromStock.transferOut(
        line.quantity,
        event.toBranchId,
        this.batchSelector,
        event.postedAt,
      );

      const toStock = await this.stockRepo.findOrCreate(
        line.skuId,
        event.toBranchId,
        line.quantity.unit,
        Quantity.of(0, line.quantity.unit),
      );

      toStock.transferIn(transferDetails, event.postedAt, this.idGen);

      await this.stockRepo.save(fromStock);
      await this.stockRepo.save(toStock);
    }

    await this.idempotency.markProcessed(key);
  }
}
