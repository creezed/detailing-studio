export class ClientAnonymizationRequestedEvent {
  constructor(
    public readonly requestId: string,
    public readonly clientId: string,
    public readonly requestedBy: string,
    public readonly requestedAt: string,
  ) {}
}
