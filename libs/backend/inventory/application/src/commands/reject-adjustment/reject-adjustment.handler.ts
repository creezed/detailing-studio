import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IAdjustmentRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { RejectAdjustmentCommand } from './reject-adjustment.command';
import { ADJUSTMENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { AdjustmentNotFoundError } from '../../errors/application.errors';

@CommandHandler(RejectAdjustmentCommand)
export class RejectAdjustmentHandler implements ICommandHandler<RejectAdjustmentCommand, void> {
  constructor(
    @Inject(ADJUSTMENT_REPOSITORY) private readonly adjustmentRepo: IAdjustmentRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: RejectAdjustmentCommand): Promise<void> {
    const adjustment = await this.adjustmentRepo.findById(cmd.adjustmentId);

    if (!adjustment) {
      throw new AdjustmentNotFoundError(cmd.adjustmentId);
    }

    adjustment.reject(cmd.rejectedBy, this.clock.now(), cmd.reason);

    await this.adjustmentRepo.save(adjustment);
  }
}
