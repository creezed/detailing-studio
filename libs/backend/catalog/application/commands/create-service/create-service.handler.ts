import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { Service } from '@det/backend/catalog/domain';
import type { IServiceRepository, ServiceId } from '@det/backend/catalog/domain';
import type { IClock, IIdGenerator } from '@det/backend/shared/ddd';

import { CreateServiceCommand } from './create-service.command';
import { CLOCK, ID_GENERATOR, SERVICE_REPOSITORY } from '../../di/tokens';

@CommandHandler(CreateServiceCommand)
export class CreateServiceHandler implements ICommandHandler<CreateServiceCommand, ServiceId> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: CreateServiceCommand): Promise<ServiceId> {
    const service = Service.create({
      categoryId: cmd.categoryId,
      description: cmd.description,
      displayOrder: cmd.displayOrder,
      durationMinutes: cmd.durationMinutes,
      idGen: this.idGen,
      materialNorms: cmd.materialNorms,
      name: cmd.name,
      now: this.clock.now(),
      pricing: cmd.pricing,
    });

    await this.repo.save(service);

    return service.id;
  }
}
