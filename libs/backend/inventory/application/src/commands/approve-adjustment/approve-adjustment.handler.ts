import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IAdjustmentRepository } from '@det/backend-inventory-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { ApproveAdjustmentCommand } from './approve-adjustment.command';
import { ADJUSTMENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { AdjustmentNotFoundError } from '../../errors/application.errors';

@CommandHandler(ApproveAdjustmentCommand)
export class ApproveAdjustmentHandler implements ICommandHandler<ApproveAdjustmentCommand, void> {
  constructor(
    @Inject(ADJUSTMENT_REPOSITORY) private readonly adjustmentRepo: IAdjustmentRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: ApproveAdjustmentCommand): Promise<void> {
    const adjustment = await this.adjustmentRepo.findById(cmd.adjustmentId);

    if (!adjustment) {
      throw new AdjustmentNotFoundError(cmd.adjustmentId);
    }

    adjustment.approve(cmd.approvedBy, this.clock.now());

    await this.adjustmentRepo.save(adjustment);
  }
}
