import type { DynamicQueryRequest } from '@det/backend-shared-querying';

export class ListServicesQuery {
  constructor(public readonly dynamicQuery: DynamicQueryRequest) {}
}
