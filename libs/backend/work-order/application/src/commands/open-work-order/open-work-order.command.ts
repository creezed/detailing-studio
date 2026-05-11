import type { DateTime, Quantity } from '@det/backend-shared-ddd';

export interface OpenWorkOrderServiceInput {
  readonly serviceId: string;
  readonly serviceNameSnapshot: string;
  readonly durationMinutes: number;
  readonly priceRubles: string;
}

export interface OpenWorkOrderNormInput {
  readonly skuId: string;
  readonly skuNameSnapshot: string;
  readonly normAmount: Quantity;
}

export class OpenWorkOrderCommand {
  constructor(
    public readonly appointmentId: string,
    public readonly branchId: string,
    public readonly masterId: string,
    public readonly clientId: string,
    public readonly vehicleId: string,
    public readonly services: readonly OpenWorkOrderServiceInput[],
    public readonly norms: readonly OpenWorkOrderNormInput[],
    public readonly openedAt: DateTime,
  ) {}
}
