import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { BranchInUseError } from '@det/backend-scheduling-domain';
import type { IBranchRepository } from '@det/backend-scheduling-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { DeactivateBranchCommand } from './deactivate-branch.command';
import { BRANCH_REPOSITORY, BRANCH_USAGE_PORT, CLOCK } from '../../di/tokens';
import { BranchNotFoundError } from '../../errors/application.errors';

import type { IBranchUsagePort } from '../../ports/branch-usage.port';

@CommandHandler(DeactivateBranchCommand)
export class DeactivateBranchHandler implements ICommandHandler<DeactivateBranchCommand, void> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(BRANCH_USAGE_PORT) private readonly usagePort: IBranchUsagePort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: DeactivateBranchCommand): Promise<void> {
    const branch = await this.branchRepo.findById(cmd.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(cmd.branchId);
    }

    if (await this.usagePort.hasActiveAppointments(cmd.branchId)) {
      throw new BranchInUseError(cmd.branchId);
    }

    branch.deactivate(this.clock.now());
    await this.branchRepo.save(branch);
  }
}
