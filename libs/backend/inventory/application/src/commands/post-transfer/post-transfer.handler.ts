import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { ITransferRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { PostTransferCommand } from './post-transfer.command';
import { CLOCK, TRANSFER_REPOSITORY } from '../../di/tokens';
import { TransferNotFoundError } from '../../errors/application.errors';

@CommandHandler(PostTransferCommand)
export class PostTransferHandler implements ICommandHandler<PostTransferCommand> {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly repo: ITransferRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: PostTransferCommand): Promise<void> {
    const transfer = await this.repo.findById(cmd.transferId);

    if (!transfer) {
      throw new TransferNotFoundError(cmd.transferId);
    }

    transfer.post(cmd.postedBy, this.clock.now());
    await this.repo.save(transfer);
  }
}
