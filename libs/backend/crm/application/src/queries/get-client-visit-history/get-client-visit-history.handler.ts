import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetClientVisitHistoryQuery } from './get-client-visit-history.query';
import { VISIT_HISTORY_READ_PORT } from '../../di/tokens';

import type { CursorPaginatedResult, IVisitHistoryReadPort } from '../../ports/visit-history.port';
import type { VisitHistoryItemReadModel } from '../../read-models/visit-history.read-model';

@QueryHandler(GetClientVisitHistoryQuery)
export class GetClientVisitHistoryHandler implements IQueryHandler<
  GetClientVisitHistoryQuery,
  CursorPaginatedResult<VisitHistoryItemReadModel>
> {
  constructor(@Inject(VISIT_HISTORY_READ_PORT) private readonly _readPort: IVisitHistoryReadPort) {}

  async execute(
    query: GetClientVisitHistoryQuery,
  ): Promise<CursorPaginatedResult<VisitHistoryItemReadModel>> {
    return this._readPort.findByClientId(query.clientId, query.limit, query.cursor);
  }
}
