export class AnonymizeClientCommand {
  constructor(
    public readonly clientId: string,
    public readonly by: string,
    public readonly reason: string,
    public readonly anonymizationRequestId: string | null = null,
  ) {}
}
