import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IReceiptRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { CancelReceiptCommand } from './cancel-receipt.command';
import { BATCH_USAGE_PORT, CLOCK, RECEIPT_REPOSITORY } from '../../di/tokens';
import {
  ReceiptBatchesAlreadyConsumedError,
  ReceiptNotFoundError,
} from '../../errors/application.errors';

import type { IBatchUsagePort } from '../../ports/batch-usage.port';

@CommandHandler(CancelReceiptCommand)
export class CancelReceiptHandler implements ICommandHandler<CancelReceiptCommand, void> {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receiptRepo: IReceiptRepository,
    @Inject(BATCH_USAGE_PORT) private readonly batchUsagePort: IBatchUsagePort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: CancelReceiptCommand): Promise<void> {
    const receipt = await this.receiptRepo.findById(cmd.receiptId);

    if (!receipt) {
      throw new ReceiptNotFoundError(cmd.receiptId);
    }

    const untouched = await this.batchUsagePort.areBatchesUntouched(cmd.receiptId);

    if (!untouched) {
      throw new ReceiptBatchesAlreadyConsumedError(cmd.receiptId);
    }

    receipt.cancel(cmd.reason, this.clock.now());

    await this.receiptRepo.save(receipt);
  }
}
