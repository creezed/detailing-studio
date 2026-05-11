import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ListBaysByBranchQuery } from './list-bays-by-branch.query';
import { BAY_READ_PORT } from '../../di/tokens';

import type { IBayReadPort } from '../../ports/bay-read.port';
import type { BayReadModel } from '../../read-models/scheduling.read-models';

@QueryHandler(ListBaysByBranchQuery)
export class ListBaysByBranchHandler implements IQueryHandler<
  ListBaysByBranchQuery,
  readonly BayReadModel[]
> {
  constructor(@Inject(BAY_READ_PORT) private readonly bayReadPort: IBayReadPort) {}

  execute(query: ListBaysByBranchQuery): Promise<readonly BayReadModel[]> {
    return this.bayReadPort.listByBranch(query.branchId);
  }
}
