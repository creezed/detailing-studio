export class ListAdjustmentsQuery {
  constructor(
    public readonly offset: number,
    public readonly limit: number,
    public readonly branchId?: string,
    public readonly status?: string,
  ) {}
}
