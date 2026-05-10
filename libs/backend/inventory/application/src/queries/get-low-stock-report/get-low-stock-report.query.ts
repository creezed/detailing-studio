export class GetLowStockReportQuery {
  constructor(
    public readonly offset: number,
    public readonly limit: number,
  ) {}
}
