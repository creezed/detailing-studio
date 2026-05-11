import type { Quantity } from '@det/backend-shared-ddd';

export class AddConsumptionCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly skuId: string,
    public readonly actualAmount: Quantity,
    public readonly by: string,
    public readonly deviationReason?: string,
    public readonly comment?: string,
  ) {}
}
