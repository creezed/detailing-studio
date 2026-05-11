export class RemoveConsumptionLineCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly lineId: string,
    public readonly by: string,
  ) {}
}
