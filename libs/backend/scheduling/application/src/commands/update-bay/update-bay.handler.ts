import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IBayRepository } from '@det/backend-scheduling-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpdateBayCommand } from './update-bay.command';
import { BAY_REPOSITORY, CLOCK } from '../../di/tokens';
import { BayNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateBayCommand)
export class UpdateBayHandler implements ICommandHandler<UpdateBayCommand, void> {
  constructor(
    @Inject(BAY_REPOSITORY) private readonly bayRepo: IBayRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: UpdateBayCommand): Promise<void> {
    const bay = await this.bayRepo.findById(cmd.bayId);
    if (bay === null) {
      throw new BayNotFoundError(cmd.bayId);
    }

    bay.rename(cmd.name, this.clock.now());
    await this.bayRepo.save(bay);
  }
}
