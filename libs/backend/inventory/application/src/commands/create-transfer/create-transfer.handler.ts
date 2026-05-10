import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Transfer, TransferId, TransferLine } from '@det/backend-inventory-domain';
import type { ITransferRepository } from '@det/backend-inventory-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateTransferCommand } from './create-transfer.command';
import { CLOCK, ID_GENERATOR, TRANSFER_REPOSITORY } from '../../di/tokens';

@CommandHandler(CreateTransferCommand)
export class CreateTransferHandler implements ICommandHandler<CreateTransferCommand> {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly repo: ITransferRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: CreateTransferCommand): Promise<{ id: TransferId }> {
    const id = TransferId.from(this.idGen.generate());

    const lines = cmd.lines.map((l) => TransferLine.create(l.skuId, l.quantity));

    const transfer = Transfer.create({
      id,
      fromBranchId: cmd.fromBranchId,
      toBranchId: cmd.toBranchId,
      lines,
      createdBy: cmd.createdBy,
      createdAt: this.clock.now(),
    });

    await this.repo.save(transfer);

    return { id };
  }
}
