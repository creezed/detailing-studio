import type { Quantity } from '@det/backend-shared-ddd';

export class UpdateConsumptionLineCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly lineId: string,
    public readonly actualAmount: Quantity,
    public readonly by: string,
    public readonly deviationReason?: string,
    public readonly comment?: string,
  ) {}
}
