import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IServiceCategoryRepository } from '@det/backend/catalog/domain';
import type { IClock } from '@det/backend/shared/ddd';

import { DeactivateServiceCategoryCommand } from './deactivate-service-category.command';
import { CLOCK, SERVICE_CATEGORY_REPOSITORY } from '../../di/tokens';
import { ServiceCategoryNotFoundError } from '../../errors/application.errors';

@CommandHandler(DeactivateServiceCategoryCommand)
export class DeactivateServiceCategoryHandler implements ICommandHandler<
  DeactivateServiceCategoryCommand,
  void
> {
  constructor(
    @Inject(SERVICE_CATEGORY_REPOSITORY) private readonly repo: IServiceCategoryRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(cmd: DeactivateServiceCategoryCommand): Promise<void> {
    const category = await this.repo.findById(cmd.categoryId);

    if (!category) {
      throw new ServiceCategoryNotFoundError(cmd.categoryId);
    }

    category.deactivate(this.clock.now());

    await this.repo.save(category);
  }
}
