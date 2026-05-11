import type {
  AppointmentStatus,
  CancellationRequestStatus,
  CreationChannel,
  DayOfWeek,
} from '@det/backend-scheduling-domain';

export interface TimeOfDayRecord {
  readonly hour: number;
  readonly minute: number;
}

export interface WorkingDayRecord {
  readonly open: TimeOfDayRecord;
  readonly close: TimeOfDayRecord;
  readonly breakStart: TimeOfDayRecord | null;
  readonly breakEnd: TimeOfDayRecord | null;
}

export interface WeeklyPatternRecord {
  readonly dayOfWeek: DayOfWeek;
  readonly workingDay: WorkingDayRecord | null;
}

export interface TimeRangeRecord {
  readonly start: TimeOfDayRecord;
  readonly end: TimeOfDayRecord;
}

export interface ScheduleExceptionRecord {
  readonly date: string;
  readonly isClosed: boolean;
  readonly customRange: TimeRangeRecord | null;
  readonly reason: string | null;
}

export interface UnavailabilityRecord {
  readonly id: string;
  readonly fromAt: string;
  readonly toAt: string;
  readonly reason: string;
}

export interface AppointmentCancellationRequestRecord {
  readonly id: string;
  readonly requestedAt: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly status: CancellationRequestStatus;
  readonly decidedAt: string | null;
  readonly decidedBy: string | null;
  readonly decisionReason: string | null;
}

export interface AppointmentServiceRecord {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceNameSnapshot: string;
  readonly durationMinutesSnapshot: number;
  readonly priceCents: string;
}

export interface AppointmentRowRecord {
  readonly id: string;
  readonly clientId: string;
  readonly vehicleId: string;
  readonly branchId: string;
  readonly bayId: string | null;
  readonly masterId: string;
  readonly services: readonly AppointmentServiceRecord[];
  readonly slotStart: string;
  readonly slotEnd: string;
  readonly timezone: string;
  readonly status: AppointmentStatus;
  readonly cancellationRequest: AppointmentCancellationRequestRecord | null;
  readonly createdBy: string;
  readonly createdVia: CreationChannel;
  readonly createdAt: string;
  readonly version: number;
}
