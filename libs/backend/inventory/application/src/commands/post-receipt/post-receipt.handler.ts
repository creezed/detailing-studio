import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IReceiptRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { PostReceiptCommand } from './post-receipt.command';
import { CLOCK, RECEIPT_REPOSITORY } from '../../di/tokens';
import { ReceiptNotFoundError } from '../../errors/application.errors';

@CommandHandler(PostReceiptCommand)
export class PostReceiptHandler implements ICommandHandler<PostReceiptCommand, void> {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receiptRepo: IReceiptRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: PostReceiptCommand): Promise<void> {
    const receipt = await this.receiptRepo.findById(cmd.receiptId);

    if (!receipt) {
      throw new ReceiptNotFoundError(cmd.receiptId);
    }

    receipt.post(cmd.postedBy, this.clock.now());

    await this.receiptRepo.save(receipt);
  }
}
