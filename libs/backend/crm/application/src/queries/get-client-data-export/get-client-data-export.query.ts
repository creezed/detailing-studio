export class GetClientDataExportQuery {
  constructor(
    public readonly clientId: string,
    public readonly exportId: string,
  ) {}
}
