export class CloseWorkOrderCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly by: string,
    public readonly idempotencyKey: string,
  ) {}
}
