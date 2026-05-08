import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IServiceRepository } from '@det/backend/catalog/domain';
import type { IClock } from '@det/backend/shared/ddd';

import { SetServiceMaterialNormsCommand } from './set-service-material-norms.command';
import { CLOCK, SERVICE_REPOSITORY } from '../../di/tokens';
import { ServiceNotFoundError } from '../../errors/application.errors';

@CommandHandler(SetServiceMaterialNormsCommand)
export class SetServiceMaterialNormsHandler implements ICommandHandler<
  SetServiceMaterialNormsCommand,
  void
> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: SetServiceMaterialNormsCommand): Promise<void> {
    const service = await this.repo.findById(cmd.serviceId);

    if (!service) {
      throw new ServiceNotFoundError(cmd.serviceId);
    }

    service.setNorms(cmd.norms, this.clock.now());

    await this.repo.save(service);
  }
}
