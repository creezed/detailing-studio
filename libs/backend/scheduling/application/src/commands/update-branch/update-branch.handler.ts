import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IBranchRepository } from '@det/backend-scheduling-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpdateBranchCommand } from './update-branch.command';
import { BRANCH_REPOSITORY, CLOCK } from '../../di/tokens';
import { BranchNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateBranchCommand)
export class UpdateBranchHandler implements ICommandHandler<UpdateBranchCommand, void> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: UpdateBranchCommand): Promise<void> {
    const branch = await this.branchRepo.findById(cmd.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(cmd.branchId);
    }

    const now = this.clock.now();

    if (cmd.name !== undefined) {
      branch.rename(cmd.name, now);
    }
    if (cmd.address !== undefined) {
      branch.updateAddress(cmd.address, now);
    }
    if (cmd.timezone !== undefined) {
      branch.changeTimezone(cmd.timezone, now);
    }

    await this.branchRepo.save(branch);
  }
}
