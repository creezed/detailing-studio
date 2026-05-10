import { Inject } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { AdjustmentApproved } from '@det/backend-inventory-domain';
import type { IBatchSelector, IStockRepository } from '@det/backend-inventory-domain';
import { Quantity } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import type { BranchId } from '@det/shared-types';

import { BATCH_SELECTOR, ID_GENERATOR, IDEMPOTENCY_PORT, STOCK_REPOSITORY } from '../di/tokens';

import type { IIdempotencyPort } from '../ports/idempotency.port';

@EventsHandler(AdjustmentApproved)
export class ApplyAdjustmentSaga implements IEventHandler<AdjustmentApproved> {
  constructor(
    @Inject(STOCK_REPOSITORY) private readonly stockRepo: IStockRepository,
    @Inject(BATCH_SELECTOR) private readonly batchSelector: IBatchSelector,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(IDEMPOTENCY_PORT) private readonly idempotency: IIdempotencyPort,
  ) {}

  async handle(event: AdjustmentApproved): Promise<void> {
    for (const line of event.lines) {
      const key = `adjustment:${event.adjustmentId as string}:${line.skuId as string}`;

      if (await this.idempotency.hasProcessed(key)) {
        continue;
      }

      const stock = await this.stockRepo.findOrCreate(
        line.skuId,
        event.branchId as unknown as BranchId,
        line.delta.unit,
        Quantity.of(0, line.delta.unit),
      );

      stock.adjust(
        line.delta,
        event.reason,
        event.approvedBy,
        this.batchSelector,
        event.approvedAt,
        this.idGen,
      );

      await this.stockRepo.save(stock);
      await this.idempotency.markProcessed(key);
    }
  }
}
