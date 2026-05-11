export class ReopenWorkOrderCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly by: string,
    public readonly reason: string,
  ) {}
}
