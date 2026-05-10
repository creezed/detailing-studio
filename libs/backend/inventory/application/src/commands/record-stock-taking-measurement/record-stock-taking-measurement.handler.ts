import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IStockTakingRepository } from '@det/backend-inventory-domain';

import { RecordStockTakingMeasurementCommand } from './record-stock-taking-measurement.command';
import { STOCK_TAKING_REPOSITORY } from '../../di/tokens';
import { StockTakingNotFoundError } from '../../errors/application.errors';

@CommandHandler(RecordStockTakingMeasurementCommand)
export class RecordStockTakingMeasurementHandler implements ICommandHandler<RecordStockTakingMeasurementCommand> {
  constructor(@Inject(STOCK_TAKING_REPOSITORY) private readonly repo: IStockTakingRepository) {}

  async execute(cmd: RecordStockTakingMeasurementCommand): Promise<void> {
    const st = await this.repo.findById(cmd.stockTakingId);

    if (!st) {
      throw new StockTakingNotFoundError(cmd.stockTakingId);
    }

    st.recordMeasurement(cmd.skuId, cmd.actual);
    await this.repo.save(st);
  }
}
