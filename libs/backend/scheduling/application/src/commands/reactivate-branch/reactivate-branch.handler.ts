import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IBranchRepository } from '@det/backend-scheduling-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { ReactivateBranchCommand } from './reactivate-branch.command';
import { BRANCH_REPOSITORY, CLOCK } from '../../di/tokens';
import { BranchNotFoundError } from '../../errors/application.errors';

@CommandHandler(ReactivateBranchCommand)
export class ReactivateBranchHandler implements ICommandHandler<ReactivateBranchCommand, void> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: ReactivateBranchCommand): Promise<void> {
    const branch = await this.branchRepo.findById(cmd.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(cmd.branchId);
    }

    branch.reactivate(this.clock.now());
    await this.branchRepo.save(branch);
  }
}
