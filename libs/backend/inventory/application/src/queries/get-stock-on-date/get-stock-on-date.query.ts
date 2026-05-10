export class GetStockOnDateQuery {
  constructor(
    public readonly branchId: string,
    public readonly date: string,
  ) {}
}
