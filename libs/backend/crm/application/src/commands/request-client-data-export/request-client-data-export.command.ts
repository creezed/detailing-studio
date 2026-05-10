export class RequestClientDataExportCommand {
  constructor(
    public readonly clientId: string,
    public readonly requestedBy: string,
  ) {}
}
