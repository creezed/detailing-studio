export class ListReceiptsQuery {
  constructor(
    public readonly offset: number,
    public readonly limit: number,
    public readonly branchId?: string,
    public readonly status?: string,
    public readonly fromDate?: string,
    public readonly toDate?: string,
  ) {}
}
