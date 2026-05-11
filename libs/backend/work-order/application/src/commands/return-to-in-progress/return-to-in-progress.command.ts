export class ReturnToInProgressCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly by: string,
    public readonly reason: string,
  ) {}
}
