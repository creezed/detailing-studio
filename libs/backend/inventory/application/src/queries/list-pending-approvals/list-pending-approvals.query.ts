export class ListPendingApprovalsQuery {
  constructor(
    public readonly offset: number,
    public readonly limit: number,
  ) {}
}
