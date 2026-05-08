import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { IServiceCategoryRepository } from '@det/backend/catalog/domain';

import { ListServiceCategoriesQuery } from './list-service-categories.query';
import { SERVICE_CATEGORY_REPOSITORY } from '../../di/tokens';
import { toServiceCategoryDto } from '../../dto/service-category.dto';

import type { ServiceCategoryDto } from '../../dto/service-category.dto';

@QueryHandler(ListServiceCategoriesQuery)
export class ListServiceCategoriesHandler implements IQueryHandler<
  ListServiceCategoriesQuery,
  ServiceCategoryDto[]
> {
  constructor(
    @Inject(SERVICE_CATEGORY_REPOSITORY) private readonly repo: IServiceCategoryRepository,
  ) {}

  async execute(query: ListServiceCategoriesQuery): Promise<ServiceCategoryDto[]> {
    const categories = await this.repo.findAll(query.includeInactive);

    return categories.map((c) => toServiceCategoryDto(c.toSnapshot()));
  }
}
