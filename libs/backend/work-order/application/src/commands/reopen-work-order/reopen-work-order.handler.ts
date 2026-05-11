import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrderId, WorkOrderStatus } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { ReopenWorkOrderCommand } from './reopen-work-order.command';
import { CLOCK, ID_GENERATOR, INVENTORY_STOCK_PORT, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import { WorkOrderNotFoundError } from '../../errors/application.errors';

import type { IInventoryStockPort } from '../../ports/inventory-stock.port';
import type { ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(ReopenWorkOrderCommand)
export class ReopenWorkOrderHandler implements ICommandHandler<ReopenWorkOrderCommand, void> {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly _repo: IWorkOrderRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
    @Inject(ID_GENERATOR) private readonly _idGen: IIdGenerator,
    @Inject(INVENTORY_STOCK_PORT) private readonly _stock: IInventoryStockPort,
  ) {}

  async execute(cmd: ReopenWorkOrderCommand): Promise<void> {
    const wo = await this._repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    const snapshot = wo.toSnapshot();

    if (snapshot.status === WorkOrderStatus.IN_PROGRESS) {
      return;
    }

    const now = this._clock.now();
    wo.reopen(cmd.by, cmd.reason, now);

    const reopenAttemptId = this._idGen.generate();
    const linesToCompensate = snapshot.lines.filter((l) => l.actualAmount > 0);

    for (const line of linesToCompensate) {
      await this._stock.compensate({
        sourceType: 'WORK_ORDER',
        sourceDocId: cmd.workOrderId,
        sourceLineId: line.id,
        idempotencyKey: `WO:${cmd.workOrderId}:${line.id}:reopen:${reopenAttemptId}`,
      });
    }

    await this._repo.save(wo);
  }
}
