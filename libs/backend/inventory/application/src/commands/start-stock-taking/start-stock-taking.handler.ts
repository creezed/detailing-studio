import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { StockTaking, StockTakingId } from '@det/backend-inventory-domain';
import type { IStockTakingRepository } from '@det/backend-inventory-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { StartStockTakingCommand } from './start-stock-taking.command';
import { CLOCK, ID_GENERATOR, STOCK_SNAPSHOT_PORT, STOCK_TAKING_REPOSITORY } from '../../di/tokens';

import type { IStockSnapshotPort } from '../../ports/stock-snapshot.port';

@CommandHandler(StartStockTakingCommand)
export class StartStockTakingHandler implements ICommandHandler<StartStockTakingCommand> {
  constructor(
    @Inject(STOCK_TAKING_REPOSITORY) private readonly repo: IStockTakingRepository,
    @Inject(STOCK_SNAPSHOT_PORT) private readonly snapshotPort: IStockSnapshotPort,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: StartStockTakingCommand): Promise<{ id: StockTakingId }> {
    const id = StockTakingId.from(this.idGen.generate());
    const snapshotLines = await this.snapshotPort.snapshotForBranch(cmd.branchId);

    const stockTaking = StockTaking.start({
      id,
      branchId: cmd.branchId,
      createdBy: cmd.createdBy,
      startedAt: this.clock.now(),
      snapshotLines: snapshotLines.map((sl) => ({
        skuId: sl.skuId,
        expectedQuantity: sl.currentQuantity,
      })),
    });

    await this.repo.save(stockTaking);

    return { id };
  }
}
