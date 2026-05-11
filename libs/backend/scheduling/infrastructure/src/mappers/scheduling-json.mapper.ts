import {
  AppointmentServiceId,
  CancellationRequestId,
  ScheduleException,
  TimeOfDay,
  TimeRange,
  Unavailability,
  UnavailabilityId,
  WorkingDay,
} from '@det/backend-scheduling-domain';
import type {
  AppointmentService,
  CancellationRequest,
  MasterWeeklyPattern,
  WeeklyPattern,
} from '@det/backend-scheduling-domain';
import { DateTime, Money } from '@det/backend-shared-ddd';

import type {
  AppointmentCancellationRequestRecord,
  AppointmentServiceRecord,
  ScheduleExceptionRecord,
  TimeOfDayRecord,
  TimeRangeRecord,
  UnavailabilityRecord,
  WeeklyPatternRecord,
  WorkingDayRecord,
} from '../persistence/scheduling-json.types';

export function serializeWeeklyPattern(
  pattern: WeeklyPattern | MasterWeeklyPattern,
): readonly WeeklyPatternRecord[] {
  return [...pattern.entries()].map(([dayOfWeek, workingDay]) => ({
    dayOfWeek,
    workingDay: workingDay === null ? null : serializeWorkingDay(workingDay),
  }));
}

export function deserializeWeeklyPattern(records: readonly WeeklyPatternRecord[]): WeeklyPattern {
  return new Map(
    records.map((record) => [
      record.dayOfWeek,
      record.workingDay === null ? null : deserializeWorkingDay(record.workingDay),
    ]),
  );
}

export function serializeScheduleExceptions(
  exceptions: readonly ScheduleException[],
): readonly ScheduleExceptionRecord[] {
  return exceptions.map((exception) => ({
    customRange: exception.customRange === null ? null : serializeTimeRange(exception.customRange),
    date: exception.date,
    isClosed: exception.isClosed,
    reason: exception.reason,
  }));
}

export function deserializeScheduleException(record: ScheduleExceptionRecord): ScheduleException {
  return ScheduleException.from({
    customRange: record.customRange === null ? null : deserializeTimeRange(record.customRange),
    date: record.date,
    isClosed: record.isClosed,
    reason: record.reason,
  });
}

export function serializeUnavailabilities(
  unavailabilities: readonly Unavailability[],
): readonly UnavailabilityRecord[] {
  return unavailabilities.map((unavailability) => ({
    fromAt: unavailability.fromAt.iso(),
    id: unavailability.id,
    reason: unavailability.reason,
    toAt: unavailability.toAt.iso(),
  }));
}

export function deserializeUnavailability(record: UnavailabilityRecord): Unavailability {
  return Unavailability.from({
    fromAt: DateTime.from(record.fromAt),
    id: UnavailabilityId.from(record.id),
    reason: record.reason,
    toAt: DateTime.from(record.toAt),
  });
}

export function serializeAppointmentService(service: AppointmentService): AppointmentServiceRecord {
  return {
    durationMinutesSnapshot: service.durationMinutesSnapshot,
    id: service.id,
    priceCents: service.priceSnapshot.cents.toString(),
    serviceId: service.serviceId,
    serviceNameSnapshot: service.serviceNameSnapshot,
  };
}

export function deserializeAppointmentService(
  record: AppointmentServiceRecord,
): AppointmentService {
  return {
    durationMinutesSnapshot: record.durationMinutesSnapshot,
    id: AppointmentServiceId.from(record.id),
    priceSnapshot: Money.rub(centsToRubAmount(record.priceCents)),
    serviceId: record.serviceId,
    serviceNameSnapshot: record.serviceNameSnapshot,
  };
}

export function serializeCancellationRequest(
  request: CancellationRequest | null,
): AppointmentCancellationRequestRecord | null {
  if (request === null) {
    return null;
  }

  return {
    decidedAt: request.decidedAt?.iso() ?? null,
    decidedBy: request.decidedBy,
    decisionReason: request.decisionReason,
    id: request.id,
    reason: request.reason,
    requestedAt: request.requestedAt.iso(),
    requestedBy: request.requestedBy,
    status: request.status,
  };
}

export function deserializeCancellationRequest(
  record: AppointmentCancellationRequestRecord | null,
): CancellationRequest | null {
  if (record === null) {
    return null;
  }

  return {
    decidedAt: record.decidedAt === null ? null : DateTime.from(record.decidedAt),
    decidedBy: record.decidedBy,
    decisionReason: record.decisionReason,
    id: CancellationRequestId.from(record.id),
    reason: record.reason,
    requestedAt: DateTime.from(record.requestedAt),
    requestedBy: record.requestedBy,
    status: record.status,
  };
}

function serializeWorkingDay(workingDay: WorkingDay): WorkingDayRecord {
  return {
    breakEnd: workingDay.breakEnd === null ? null : serializeTimeOfDay(workingDay.breakEnd),
    breakStart: workingDay.breakStart === null ? null : serializeTimeOfDay(workingDay.breakStart),
    close: serializeTimeOfDay(workingDay.close),
    open: serializeTimeOfDay(workingDay.open),
  };
}

function deserializeWorkingDay(record: WorkingDayRecord): WorkingDay {
  return WorkingDay.from({
    breakEnd: record.breakEnd === null ? null : deserializeTimeOfDay(record.breakEnd),
    breakStart: record.breakStart === null ? null : deserializeTimeOfDay(record.breakStart),
    close: deserializeTimeOfDay(record.close),
    open: deserializeTimeOfDay(record.open),
  });
}

function serializeTimeRange(range: TimeRange): TimeRangeRecord {
  return {
    end: serializeTimeOfDay(range.end),
    start: serializeTimeOfDay(range.start),
  };
}

function deserializeTimeRange(record: TimeRangeRecord): TimeRange {
  return TimeRange.from(deserializeTimeOfDay(record.start), deserializeTimeOfDay(record.end));
}

function serializeTimeOfDay(time: TimeOfDay): TimeOfDayRecord {
  return {
    hour: time.hour,
    minute: time.minute,
  };
}

function deserializeTimeOfDay(record: TimeOfDayRecord): TimeOfDay {
  return TimeOfDay.from(record.hour, record.minute);
}

function centsToRubAmount(cents: string): string {
  const padded = cents.padStart(3, '0');
  const rubles = padded.slice(0, -2);
  const kopeks = padded.slice(-2);
  return `${rubles}.${kopeks}`;
}
