export class CancelWorkOrderCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly reason: string,
    public readonly by: string,
  ) {}
}
