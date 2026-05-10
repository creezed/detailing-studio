export class GiveConsentCommand {
  constructor(
    public readonly clientId: string,
    public readonly type: string,
    public readonly policyVersion: string | null = null,
  ) {}
}
