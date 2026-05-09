import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { GetServiceQueryCapabilitiesQuery } from './get-service-query-capabilities.query';
import { CATALOG_SERVICE_QUERY_CAPABILITIES } from '../../querying/service-querying.config';

import type { QueryCapabilitiesDto } from '../../dto/query-capabilities.dto';

@QueryHandler(GetServiceQueryCapabilitiesQuery)
export class GetServiceQueryCapabilitiesHandler implements IQueryHandler<
  GetServiceQueryCapabilitiesQuery,
  QueryCapabilitiesDto
> {
  execute(): Promise<QueryCapabilitiesDto> {
    return Promise.resolve(CATALOG_SERVICE_QUERY_CAPABILITIES);
  }
}
