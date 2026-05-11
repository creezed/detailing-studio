export class ListBranchesQuery {
  constructor(
    public readonly isActive?: boolean,
    public readonly page = 1,
    public readonly pageSize = 20,
  ) {}
}
