export class RequestClientAnonymizationCommand {
  constructor(
    public readonly clientId: string,
    public readonly requestedBy: 'CLIENT' | 'MANAGER' | 'OWNER',
    public readonly reason: string,
  ) {}
}
