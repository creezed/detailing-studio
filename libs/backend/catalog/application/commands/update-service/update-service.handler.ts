import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IServiceRepository } from '@det/backend/catalog/domain';

import { UpdateServiceCommand } from './update-service.command';
import { SERVICE_REPOSITORY } from '../../di/tokens';
import { ServiceNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateServiceCommand)
export class UpdateServiceHandler implements ICommandHandler<UpdateServiceCommand, void> {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository) {}

  async execute(cmd: UpdateServiceCommand): Promise<void> {
    const service = await this.repo.findById(cmd.serviceId);

    if (!service) {
      throw new ServiceNotFoundError(cmd.serviceId);
    }

    if (cmd.name !== undefined) {
      service.rename(cmd.name);
    }

    if (cmd.description !== undefined) {
      service.setDescription(cmd.description);
    }

    if (cmd.durationMinutes !== undefined) {
      service.setDuration(cmd.durationMinutes);
    }

    await this.repo.save(service);
  }
}
