import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Bay, BayId } from '@det/backend-scheduling-domain';
import type { IBranchRepository, IBayRepository } from '@det/backend-scheduling-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateBayCommand } from './create-bay.command';
import { BAY_REPOSITORY, BRANCH_REPOSITORY, CLOCK, ID_GENERATOR } from '../../di/tokens';
import { BranchNotFoundError } from '../../errors/application.errors';

@CommandHandler(CreateBayCommand)
export class CreateBayHandler implements ICommandHandler<CreateBayCommand, { id: BayId }> {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    @Inject(BAY_REPOSITORY) private readonly bayRepo: IBayRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
  ) {}

  async execute(cmd: CreateBayCommand): Promise<{ id: BayId }> {
    const branch = await this.branchRepo.findById(cmd.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(cmd.branchId);
    }

    const bay = Bay.create({
      branchId: cmd.branchId,
      idGen: this.idGen,
      name: cmd.name,
      now: this.clock.now(),
    });

    await this.bayRepo.save(bay);

    return { id: bay.id };
  }
}
