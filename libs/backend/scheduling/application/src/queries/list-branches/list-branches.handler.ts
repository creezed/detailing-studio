import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ListBranchesQuery } from './list-branches.query';
import { BRANCH_READ_PORT } from '../../di/tokens';

import type { IBranchReadPort } from '../../ports/branch-read.port';
import type {
  BranchListItemReadModel,
  PaginatedResult,
} from '../../read-models/scheduling.read-models';

@QueryHandler(ListBranchesQuery)
export class ListBranchesHandler implements IQueryHandler<
  ListBranchesQuery,
  PaginatedResult<BranchListItemReadModel>
> {
  constructor(@Inject(BRANCH_READ_PORT) private readonly branchReadPort: IBranchReadPort) {}

  execute(query: ListBranchesQuery): Promise<PaginatedResult<BranchListItemReadModel>> {
    return this.branchReadPort.list({
      isActive: query.isActive,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
