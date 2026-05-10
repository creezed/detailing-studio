import { Inject } from '@nestjs/common';
import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { AdjustmentLine, AdjustmentStatus, StockTakingPosted } from '@det/backend-inventory-domain';
import type { AdjustmentId } from '@det/backend-inventory-domain';
import { Money } from '@det/backend-shared-ddd';

import { ApproveAdjustmentCommand } from '../commands/approve-adjustment/approve-adjustment.command';
import { CreateAdjustmentCommand } from '../commands/create-adjustment/create-adjustment.command';
import { IDEMPOTENCY_PORT } from '../di/tokens';

import type { IIdempotencyPort } from '../ports/idempotency.port';

@EventsHandler(StockTakingPosted)
export class ApplyStockTakingSaga implements IEventHandler<StockTakingPosted> {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(IDEMPOTENCY_PORT) private readonly idempotency: IIdempotencyPort,
  ) {}

  async handle(event: StockTakingPosted): Promise<void> {
    const key = `stock-taking:${event.stockTakingId as string}`;

    if (await this.idempotency.hasProcessed(key)) return;

    if (event.deltas.length === 0) {
      await this.idempotency.markProcessed(key);

      return;
    }

    const lines = event.deltas.map((d) =>
      AdjustmentLine.create(d.skuId, d.delta, Money.rub('0.00')),
    );

    const { id, status } = await this.commandBus.execute<
      CreateAdjustmentCommand,
      { id: AdjustmentId; status: AdjustmentStatus }
    >(
      new CreateAdjustmentCommand(
        event.branchId,
        `StockTaking ${event.stockTakingId as string}`,
        lines.map((l) => ({
          skuId: l.skuId,
          delta: l.delta,
          snapshotUnitCost: l.snapshotUnitCost,
        })),
        event.postedBy,
      ),
    );

    if (status !== AdjustmentStatus.APPROVED) {
      await this.commandBus.execute(new ApproveAdjustmentCommand(id, event.postedBy));
    }

    await this.idempotency.markProcessed(key);
  }
}
