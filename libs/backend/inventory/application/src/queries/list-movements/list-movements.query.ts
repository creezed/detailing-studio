export class ListMovementsQuery {
  constructor(
    public readonly offset: number,
    public readonly limit: number,
    public readonly skuId?: string,
    public readonly branchId?: string,
    public readonly sourceType?: string,
    public readonly fromDate?: string,
    public readonly toDate?: string,
  ) {}
}
