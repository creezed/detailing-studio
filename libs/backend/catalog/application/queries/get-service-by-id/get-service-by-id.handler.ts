import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { IServiceRepository } from '@det/backend/catalog/domain';

import { GetServiceByIdQuery } from './get-service-by-id.query';
import { SERVICE_REPOSITORY } from '../../di/tokens';
import { toServiceDto } from '../../dto/service.dto';
import { ServiceNotFoundError } from '../../errors/application.errors';

import type { ServiceDto } from '../../dto/service.dto';

@QueryHandler(GetServiceByIdQuery)
export class GetServiceByIdHandler implements IQueryHandler<GetServiceByIdQuery, ServiceDto> {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly repo: IServiceRepository) {}

  async execute(query: GetServiceByIdQuery): Promise<ServiceDto> {
    const service = await this.repo.findById(query.serviceId);

    if (!service) {
      throw new ServiceNotFoundError(query.serviceId);
    }

    return toServiceDto(service.toSnapshot());
  }
}
