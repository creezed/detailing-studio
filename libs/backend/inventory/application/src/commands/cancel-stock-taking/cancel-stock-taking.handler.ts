import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IStockTakingRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { CancelStockTakingCommand } from './cancel-stock-taking.command';
import { CLOCK, STOCK_TAKING_REPOSITORY } from '../../di/tokens';
import { StockTakingNotFoundError } from '../../errors/application.errors';

@CommandHandler(CancelStockTakingCommand)
export class CancelStockTakingHandler implements ICommandHandler<CancelStockTakingCommand> {
  constructor(
    @Inject(STOCK_TAKING_REPOSITORY) private readonly repo: IStockTakingRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: CancelStockTakingCommand): Promise<void> {
    const st = await this.repo.findById(cmd.stockTakingId);

    if (!st) {
      throw new StockTakingNotFoundError(cmd.stockTakingId);
    }

    st.cancel(this.clock.now());
    await this.repo.save(st);
  }
}
