import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Branch, BranchId } from '@det/backend-scheduling-domain';
import type { IBranchRepository } from '@det/backend-scheduling-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateBranchCommand } from './create-branch.command';
import { BRANCH_REPOSITORY, CLOCK, ID_GENERATOR } from '../../di/tokens';

@CommandHandler(CreateBranchCommand)
export class CreateBranchHandler implements ICommandHandler<CreateBranchCommand, { id: BranchId }> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: CreateBranchCommand): Promise<{ id: BranchId }> {
    const branch = Branch.create({
      address: cmd.address,
      idGen: this.idGen,
      name: cmd.name,
      now: this.clock.now(),
      timezone: cmd.timezone,
    });

    await this.branchRepo.save(branch);

    return { id: branch.id };
  }
}
