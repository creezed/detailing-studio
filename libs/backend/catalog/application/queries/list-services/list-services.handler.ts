import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { IServiceRepository } from '@det/backend/catalog/domain';

import { ListServicesQuery } from './list-services.query';
import { SERVICE_REPOSITORY } from '../../di/tokens';
import { toServiceDto } from '../../dto/service.dto';

import type { ServiceDto } from '../../dto/service.dto';

@QueryHandler(ListServicesQuery)
export class ListServicesHandler implements IQueryHandler<ListServicesQuery, ServiceDto[]> {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository) {}

  async execute(query: ListServicesQuery): Promise<ServiceDto[]> {
    const services = await this.repo.findAll({
      categoryId: query.categoryId,
      isActive: query.isActive,
    });

    return services.map((s) => toServiceDto(s.toSnapshot()));
  }
}
