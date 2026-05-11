import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { Quantity } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator, UnitOfMeasure } from '@det/backend-shared-ddd';
import { ClosingValidator, WorkOrderId, WorkOrderStatus } from '@det/backend-work-order-domain';
import type { IWorkOrderRepository } from '@det/backend-work-order-domain';

import { CloseWorkOrderCommand } from './close-work-order.command';
import { CLOCK, ID_GENERATOR, INVENTORY_STOCK_PORT, WORK_ORDER_REPOSITORY } from '../../di/tokens';
import {
  InsufficientStockForCloseError,
  WorkOrderNotFoundError,
} from '../../errors/application.errors';

import type { InsufficientLineInfo } from '../../errors/application.errors';
import type { IInventoryStockPort } from '../../ports/inventory-stock.port';
import type { ICommandHandler } from '@nestjs/cqrs';

interface ConsumedRecord {
  readonly lineId: string;
  readonly skuId: string;
  readonly amount: Quantity;
  readonly idempotencyKey: string;
}

@CommandHandler(CloseWorkOrderCommand)
export class CloseWorkOrderHandler implements ICommandHandler<CloseWorkOrderCommand, void> {
  private readonly _validator = new ClosingValidator();

  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly _repo: IWorkOrderRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
    @Inject(ID_GENERATOR) private readonly _idGen: IIdGenerator,
    @Inject(INVENTORY_STOCK_PORT) private readonly _stock: IInventoryStockPort,
  ) {}

  async execute(cmd: CloseWorkOrderCommand): Promise<void> {
    const wo = await this._repo.findById(WorkOrderId.from(cmd.workOrderId));
    if (!wo) {
      throw new WorkOrderNotFoundError(cmd.workOrderId);
    }

    const snapshot = wo.toSnapshot();

    if (snapshot.status === WorkOrderStatus.CLOSED) {
      return;
    }

    const now = this._clock.now();

    wo.startClosing(now, this._validator);
    await this._repo.save(wo);

    const closeAttemptId = this._idGen.generate();

    const linesToConsume = snapshot.lines.filter((l) => l.actualAmount > 0);

    const preflightFails: InsufficientLineInfo[] = [];
    for (const line of linesToConsume) {
      const qty = Quantity.of(line.actualAmount, line.actualUnit as UnitOfMeasure);
      const canDo = await this._stock.canConsume(line.skuId, snapshot.branchId, qty);
      if (!canDo) {
        preflightFails.push({
          lineId: line.id,
          skuId: line.skuId,
          requested: line.actualAmount,
          unit: line.actualUnit,
        });
      }
    }

    if (preflightFails.length > 0) {
      wo.revertClosing('Pre-flight stock check failed', now);
      await this._repo.save(wo);
      throw new InsufficientStockForCloseError(preflightFails);
    }

    const consumedSoFar: ConsumedRecord[] = [];

    for (const line of linesToConsume) {
      const qty = Quantity.of(line.actualAmount, line.actualUnit as UnitOfMeasure);
      const lineKey = `WO:${cmd.workOrderId}:${line.id}:close:${closeAttemptId}`;

      const result = await this._stock.consume({
        skuId: line.skuId,
        branchId: snapshot.branchId,
        amount: qty,
        reason: 'WORK_ORDER',
        sourceType: 'WORK_ORDER',
        sourceDocId: cmd.workOrderId,
        sourceLineId: line.id,
        idempotencyKey: lineKey,
      });

      if (result.ok) {
        consumedSoFar.push({
          lineId: line.id,
          skuId: line.skuId,
          amount: qty,
          idempotencyKey: lineKey,
        });
      } else {
        for (const consumed of [...consumedSoFar].reverse()) {
          await this._stock.compensate({
            sourceType: 'WORK_ORDER',
            sourceDocId: cmd.workOrderId,
            sourceLineId: consumed.lineId,
            idempotencyKey: `${consumed.idempotencyKey}:compensate`,
          });
        }

        wo.revertClosing(`Insufficient stock for SKU ${line.skuId}`, now);
        await this._repo.save(wo);

        throw new InsufficientStockForCloseError([
          {
            lineId: line.id,
            skuId: line.skuId,
            requested: line.actualAmount,
            unit: line.actualUnit,
          },
        ]);
      }
    }

    wo.finalizeClose(now);
    await this._repo.save(wo);
  }
}
