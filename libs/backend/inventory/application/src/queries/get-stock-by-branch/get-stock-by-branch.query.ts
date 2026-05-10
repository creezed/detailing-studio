export class GetStockByBranchQuery {
  constructor(
    public readonly branchId: string,
    public readonly offset: number,
    public readonly limit: number,
  ) {}
}
