import type { WorkOrderStatus } from '@det/backend-work-order-domain';

export interface CursorPaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface WorkOrderListItemReadModel {
  readonly id: string;
  readonly appointmentId: string;
  readonly status: WorkOrderStatus;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly masterFullName: string;
  readonly clientFullName: string;
  readonly servicesCount: number;
  readonly linesCount: number;
  readonly photosCount: number;
}

export interface WorkOrderServiceDetailReadModel {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly durationMinutes: number;
  readonly priceCents: string;
}

export interface ConsumptionLineReadModel {
  readonly id: string;
  readonly skuId: string;
  readonly skuName: string;
  readonly unit: string;
  readonly normAmount: number;
  readonly actualAmount: number;
  readonly deviationRatio: number;
  readonly deviationReason: string | null;
  readonly comment: string | null;
}

export interface PhotoReadModel {
  readonly id: string;
  readonly url: string;
  readonly thumbnailUrl: string;
}

export interface PersonReadModel {
  readonly id: string;
  readonly fullName: string;
}

export interface ClientDetailReadModel {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string | null;
}

export interface VehicleReadModel {
  readonly id: string;
  readonly make: string;
  readonly model: string;
  readonly licensePlate: string;
}

export interface WorkOrderDetailReadModel {
  readonly id: string;
  readonly appointmentId: string;
  readonly status: WorkOrderStatus;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly cancellationReason: string | null;
  readonly master: PersonReadModel;
  readonly client: ClientDetailReadModel;
  readonly vehicle: VehicleReadModel;
  readonly services: readonly WorkOrderServiceDetailReadModel[];
  readonly lines: readonly ConsumptionLineReadModel[];
  readonly photosBefore: readonly PhotoReadModel[];
  readonly photosAfter: readonly PhotoReadModel[];
}

export interface NormDeviationReportItem {
  readonly workOrderId: string;
  readonly lineId: string;
  readonly skuName: string;
  readonly masterName: string;
  readonly normAmount: number;
  readonly actualAmount: number;
  readonly deviationRatio: number;
  readonly deviationReason: string | null;
}
