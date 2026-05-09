import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { ServiceCategory } from '@det/backend-catalog-domain';
import type { IServiceCategoryRepository, ServiceCategoryId } from '@det/backend-catalog-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateServiceCategoryCommand } from './create-service-category.command';
import { CLOCK, ID_GENERATOR, SERVICE_CATEGORY_REPOSITORY } from '../../di/tokens';

@CommandHandler(CreateServiceCategoryCommand)
export class CreateServiceCategoryHandler implements ICommandHandler<
  CreateServiceCategoryCommand,
  ServiceCategoryId
> {
  constructor(
    @Inject(SERVICE_CATEGORY_REPOSITORY) private readonly repo: IServiceCategoryRepository,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: CreateServiceCategoryCommand): Promise<ServiceCategoryId> {
    const category = ServiceCategory.create({
      displayOrder: cmd.displayOrder,
      icon: cmd.icon,
      idGen: this.idGen,
      name: cmd.name,
      now: this.clock.now(),
    });

    await this.repo.save(category);

    return category.id;
  }
}
