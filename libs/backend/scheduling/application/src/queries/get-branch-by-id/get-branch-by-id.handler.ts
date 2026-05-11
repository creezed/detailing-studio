import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { GetBranchByIdQuery } from './get-branch-by-id.query';
import { BRANCH_READ_PORT } from '../../di/tokens';
import { BranchNotFoundError } from '../../errors/application.errors';

import type { IBranchReadPort } from '../../ports/branch-read.port';
import type { BranchDetailReadModel } from '../../read-models/scheduling.read-models';

@QueryHandler(GetBranchByIdQuery)
export class GetBranchByIdHandler implements IQueryHandler<
  GetBranchByIdQuery,
  BranchDetailReadModel
> {
  constructor(@Inject(BRANCH_READ_PORT) private readonly branchReadPort: IBranchReadPort) {}

  async execute(query: GetBranchByIdQuery): Promise<BranchDetailReadModel> {
    const branch = await this.branchReadPort.getById(query.branchId);
    if (branch === null) {
      throw new BranchNotFoundError(query.branchId);
    }

    return branch;
  }
}
