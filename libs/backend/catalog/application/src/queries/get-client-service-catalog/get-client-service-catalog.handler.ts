import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { IServiceRepository } from '@det/backend-catalog-domain';

import { GetClientServiceCatalogQuery } from './get-client-service-catalog.query';
import { SERVICE_REPOSITORY } from '../../di/tokens';
import { toServiceCatalogItemDto } from '../../dto/service.dto';

import type { ServiceCatalogItemDto } from '../../dto/service.dto';

@QueryHandler(GetClientServiceCatalogQuery)
export class GetClientServiceCatalogHandler implements IQueryHandler<
  GetClientServiceCatalogQuery,
  ServiceCatalogItemDto[]
> {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_query: GetClientServiceCatalogQuery): Promise<ServiceCatalogItemDto[]> {
    const services = await this.repo.findAll({ isActive: true });

    return services.map((s) => toServiceCatalogItemDto(s.toSnapshot()));
  }
}
