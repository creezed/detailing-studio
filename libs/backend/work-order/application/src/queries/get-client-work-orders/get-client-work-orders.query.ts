export class GetClientWorkOrdersQuery {
  constructor(
    public readonly clientId: string,
    public readonly limit = 20,
    public readonly cursor?: string,
  ) {}
}
