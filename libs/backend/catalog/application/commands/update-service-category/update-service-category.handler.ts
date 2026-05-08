import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IServiceCategoryRepository } from '@det/backend/catalog/domain';

import { UpdateServiceCategoryCommand } from './update-service-category.command';
import { SERVICE_CATEGORY_REPOSITORY } from '../../di/tokens';
import { ServiceCategoryNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateServiceCategoryCommand)
export class UpdateServiceCategoryHandler implements ICommandHandler<
  UpdateServiceCategoryCommand,
  void
> {
  constructor(
    @Inject(SERVICE_CATEGORY_REPOSITORY) private readonly repo: IServiceCategoryRepository,
  ) {}

  async execute(cmd: UpdateServiceCategoryCommand): Promise<void> {
    const category = await this.repo.findById(cmd.categoryId);

    if (!category) {
      throw new ServiceCategoryNotFoundError(cmd.categoryId);
    }

    if (cmd.name !== undefined) {
      category.rename(cmd.name);
    }

    if (cmd.icon !== undefined) {
      category.changeIcon(cmd.icon);
    }

    if (cmd.displayOrder !== undefined) {
      category.changeDisplayOrder(cmd.displayOrder);
    }

    await this.repo.save(category);
  }
}
