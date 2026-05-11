export class GetCurrentStockForBranchQuery {
  constructor(
    public readonly branchId: string,
    public readonly skuIds: readonly string[],
  ) {}
}
