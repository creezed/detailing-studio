import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IReceiptRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpdateReceiptCommand } from './update-receipt.command';
import { CLOCK, RECEIPT_REPOSITORY } from '../../di/tokens';
import { ReceiptNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateReceiptCommand)
export class UpdateReceiptHandler implements ICommandHandler<UpdateReceiptCommand, void> {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receiptRepo: IReceiptRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: UpdateReceiptCommand): Promise<void> {
    const receipt = await this.receiptRepo.findById(cmd.receiptId);

    if (!receipt) {
      throw new ReceiptNotFoundError(cmd.receiptId);
    }

    const now = this.clock.now();
    const existingLineIds = new Set(receipt.lines.map((l) => l.id));
    const newLineIds = new Set(cmd.lines.map((l) => l.id));

    for (const lineId of existingLineIds) {
      if (!newLineIds.has(lineId)) {
        receipt.removeLine(lineId, now);
      }
    }

    for (const line of cmd.lines) {
      if (existingLineIds.has(line.id)) {
        receipt.updateLine(line.id, line, now);
      } else {
        receipt.addLine(line, now);
      }
    }

    await this.receiptRepo.save(receipt);
  }
}
