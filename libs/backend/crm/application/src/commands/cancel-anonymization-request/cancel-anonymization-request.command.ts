export class CancelAnonymizationRequestCommand {
  constructor(
    public readonly requestId: string,
    public readonly by: string,
    public readonly reason: string,
  ) {}
}
