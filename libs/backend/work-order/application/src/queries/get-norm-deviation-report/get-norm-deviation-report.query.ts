export class GetNormDeviationReportQuery {
  constructor(
    public readonly dateRange: { readonly from: string; readonly to: string },
    public readonly branchId?: string,
    public readonly masterId?: string,
  ) {}
}
