import type {
  BranchDetailReadModel,
  BranchListItemReadModel,
  PaginatedResult,
} from '../read-models/scheduling.read-models';

export interface ListBranchesFilter {
  readonly isActive?: boolean;
  readonly page: number;
  readonly pageSize: number;
}

export interface IBranchReadPort {
  list(filter: ListBranchesFilter): Promise<PaginatedResult<BranchListItemReadModel>>;
  getById(id: string): Promise<BranchDetailReadModel | null>;
}
