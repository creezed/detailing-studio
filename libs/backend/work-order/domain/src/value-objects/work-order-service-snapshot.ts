import type { Money } from '@det/backend-shared-ddd';

export interface WorkOrderServiceSnapshot {
  readonly serviceId: string;
  readonly serviceNameSnapshot: string;
  readonly durationMinutes: number;
  readonly priceSnapshot: Money;
}

export interface WorkOrderServiceSnapshotData {
  readonly serviceId: string;
  readonly serviceNameSnapshot: string;
  readonly durationMinutes: number;
  readonly priceCents: bigint;
}
