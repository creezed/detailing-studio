import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { PaginatedResponseDto } from '@det/backend/shared/querying';

import { ListServicesQuery } from './list-services.query';
import { SERVICE_READ_PORT } from '../../di/tokens';

import type { ServiceDto } from '../../dto/service.dto';
import type { IServiceReadPort } from '../../ports/service-read.port';

@QueryHandler(ListServicesQuery)
export class ListServicesHandler implements IQueryHandler<
  ListServicesQuery,
  PaginatedResponseDto<ServiceDto>
> {
  constructor(@Inject(SERVICE_READ_PORT) private readonly readPort: IServiceReadPort) {}

  async execute(query: ListServicesQuery): Promise<PaginatedResponseDto<ServiceDto>> {
    return this.readPort.list(query.dynamicQuery);
  }
}
