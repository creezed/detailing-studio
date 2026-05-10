export class RevokeConsentCommand {
  constructor(
    public readonly clientId: string,
    public readonly type: string,
  ) {}
}
