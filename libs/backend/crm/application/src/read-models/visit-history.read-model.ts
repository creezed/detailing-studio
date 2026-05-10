export type VisitHistoryStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface VisitServiceSummary {
  readonly serviceId: string;
  readonly name: string;
  readonly priceCents: number;
}

export interface VisitHistoryItemReadModel {
  readonly id: string;
  readonly clientId: string;
  readonly vehicleId: string | null;
  readonly appointmentId: string;
  readonly workOrderId: string | null;
  readonly branchId: string;
  readonly masterId: string;
  readonly servicesSummary: readonly VisitServiceSummary[];
  readonly scheduledAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly status: VisitHistoryStatus;
  readonly totalAmountCents: number | null;
  readonly materialsTotalCents: number | null;
  readonly photoCount: number;
  readonly beforePhotoUrls: readonly string[] | null;
  readonly afterPhotoUrls: readonly string[] | null;
  readonly updatedAt: string;
}
