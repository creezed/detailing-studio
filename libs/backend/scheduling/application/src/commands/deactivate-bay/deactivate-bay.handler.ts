import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IBayRepository } from '@det/backend-scheduling-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { DeactivateBayCommand } from './deactivate-bay.command';
import { BAY_REPOSITORY, BAY_USAGE_PORT, CLOCK } from '../../di/tokens';
import { BayInUseError, BayNotFoundError } from '../../errors/application.errors';

import type { IBayUsagePort } from '../../ports/bay-usage.port';

@CommandHandler(DeactivateBayCommand)
export class DeactivateBayHandler implements ICommandHandler<DeactivateBayCommand, void> {
  constructor(
    @Inject(BAY_REPOSITORY) private readonly bayRepo: IBayRepository,
    @Inject(BAY_USAGE_PORT) private readonly usagePort: IBayUsagePort,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: DeactivateBayCommand): Promise<void> {
    const bay = await this.bayRepo.findById(cmd.bayId);
    if (bay === null) {
      throw new BayNotFoundError(cmd.bayId);
    }

    if (await this.usagePort.hasFutureAppointments(cmd.bayId)) {
      throw new BayInUseError(cmd.bayId);
    }

    bay.deactivate(this.clock.now());
    await this.bayRepo.save(bay);
  }
}
