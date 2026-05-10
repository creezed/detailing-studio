import type { VisitHistoryItemReadModel } from '../read-models/visit-history.read-model';

export const VISIT_HISTORY_WRITE_PORT = Symbol('VISIT_HISTORY_WRITE_PORT');
export const VISIT_HISTORY_READ_PORT = Symbol('VISIT_HISTORY_READ_PORT');

export interface UpsertVisitHistoryData {
  readonly id: string;
  readonly clientId: string;
  readonly vehicleId: string | null;
  readonly appointmentId: string;
  readonly workOrderId: string | null;
  readonly branchId: string;
  readonly masterId: string;
  readonly servicesSummary: ReadonlyArray<{
    readonly serviceId: string;
    readonly name: string;
    readonly priceCents: number;
  }>;
  readonly scheduledAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly status: string;
  readonly totalAmountCents: number | null;
  readonly materialsTotalCents: number | null;
  readonly photoCount: number;
  readonly beforePhotoUrls: readonly string[] | null;
  readonly afterPhotoUrls: readonly string[] | null;
}

export interface IVisitHistoryWritePort {
  upsert(data: UpsertVisitHistoryData): Promise<void>;
  updateByAppointmentId(
    appointmentId: string,
    patch: Partial<UpsertVisitHistoryData>,
  ): Promise<void>;
  clearPhotosForClient(clientId: string): Promise<void>;
}

export interface CursorPaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface IVisitHistoryReadPort {
  findByClientId(
    clientId: string,
    limit: number,
    cursor: string | null,
  ): Promise<CursorPaginatedResult<VisitHistoryItemReadModel>>;
  findByVehicleId(
    vehicleId: string,
    limit: number,
    cursor: string | null,
  ): Promise<CursorPaginatedResult<VisitHistoryItemReadModel>>;
  findAllByClientId(clientId: string): Promise<readonly VisitHistoryItemReadModel[]>;
}
