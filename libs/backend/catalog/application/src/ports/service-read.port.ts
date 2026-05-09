import type { DynamicQueryRequest, PaginatedResponseDto } from '@det/backend-shared-querying';

import type { ServiceDto } from '../dto/service.dto';

export interface IServiceReadPort {
  list(query: DynamicQueryRequest): Promise<PaginatedResponseDto<ServiceDto>>;
}
