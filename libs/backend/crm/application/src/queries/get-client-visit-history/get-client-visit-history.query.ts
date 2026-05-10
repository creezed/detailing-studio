export class GetClientVisitHistoryQuery {
  constructor(
    public readonly clientId: string,
    public readonly limit: number = 20,
    public readonly cursor: string | null = null,
  ) {}
}
