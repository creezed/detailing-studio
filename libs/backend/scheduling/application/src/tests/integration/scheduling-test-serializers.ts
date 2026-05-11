import {
  AppointmentServiceId,
  ScheduleException,
  TimeOfDay,
  TimeRange,
  Unavailability,
  UnavailabilityId,
  WorkingDay,
} from '@det/backend-scheduling-domain';
import type {
  AppointmentService,
  DayOfWeek,
  MasterWeeklyPattern,
  WeeklyPattern,
} from '@det/backend-scheduling-domain';
import { DateTime, Money } from '@det/backend-shared-ddd';

import type {
  ScheduleExceptionReadModel,
  TimeRangeReadModel,
  UnavailabilityReadModel,
  WeeklyPatternDayReadModel,
  WorkingDayReadModel,
} from '../../read-models/scheduling.read-models';

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

export interface AppointmentServiceRecord {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceNameSnapshot: string;
  readonly durationMinutesSnapshot: number;
  readonly priceAmount: string;
}

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

export function deserializeScheduleExceptions(
  records: readonly ScheduleExceptionRecord[],
): readonly ScheduleException[] {
  return records.map((record) =>
    ScheduleException.from({
      customRange: record.customRange === null ? null : deserializeTimeRange(record.customRange),
      date: record.date,
      isClosed: record.isClosed,
      reason: record.reason,
    }),
  );
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

export function deserializeUnavailabilities(
  records: readonly UnavailabilityRecord[],
): readonly Unavailability[] {
  return records.map((record) =>
    Unavailability.from({
      fromAt: DateTime.from(record.fromAt),
      id: UnavailabilityId.from(record.id),
      reason: record.reason,
      toAt: DateTime.from(record.toAt),
    }),
  );
}

export function weeklyPatternToReadModel(
  pattern: readonly WeeklyPatternRecord[],
): readonly WeeklyPatternDayReadModel[] {
  return pattern.map((record) => ({
    dayOfWeek: record.dayOfWeek,
    workingDay: record.workingDay === null ? null : workingDayToReadModel(record.workingDay),
  }));
}

export function scheduleExceptionsToReadModel(
  records: readonly ScheduleExceptionRecord[],
): readonly ScheduleExceptionReadModel[] {
  return records.map((record) => ({
    customRange: record.customRange === null ? null : timeRangeToReadModel(record.customRange),
    date: record.date,
    isClosed: record.isClosed,
    reason: record.reason,
  }));
}

export function unavailabilitiesToReadModel(
  records: readonly UnavailabilityRecord[],
): readonly UnavailabilityReadModel[] {
  return records.map((record) => ({
    fromAt: record.fromAt,
    id: record.id,
    reason: record.reason,
    toAt: record.toAt,
  }));
}

export function serializeAppointmentServices(
  services: readonly AppointmentService[],
): readonly AppointmentServiceRecord[] {
  return services.map((service) => ({
    durationMinutesSnapshot: service.durationMinutesSnapshot,
    id: service.id,
    priceAmount: service.priceSnapshot.toNumber().toFixed(2),
    serviceId: service.serviceId,
    serviceNameSnapshot: service.serviceNameSnapshot,
  }));
}

export function deserializeAppointmentServices(
  records: readonly AppointmentServiceRecord[],
): readonly AppointmentService[] {
  return records.map((record) => ({
    durationMinutesSnapshot: record.durationMinutesSnapshot,
    id: AppointmentServiceId.from(record.id),
    priceSnapshot: Money.rub(record.priceAmount),
    serviceId: record.serviceId,
    serviceNameSnapshot: record.serviceNameSnapshot,
  }));
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

function workingDayToReadModel(record: WorkingDayRecord): WorkingDayReadModel {
  return {
    breaks:
      record.breakStart === null || record.breakEnd === null
        ? []
        : [
            {
              end: timeOfDayToString(record.breakEnd),
              start: timeOfDayToString(record.breakStart),
            },
          ],
    closeAt: timeOfDayToString(record.close),
    openAt: timeOfDayToString(record.open),
  };
}

function timeRangeToReadModel(record: TimeRangeRecord): TimeRangeReadModel {
  return {
    end: timeOfDayToString(record.end),
    start: timeOfDayToString(record.start),
  };
}

function timeOfDayToString(record: TimeOfDayRecord): string {
  return `${String(record.hour).padStart(2, '0')}:${String(record.minute).padStart(2, '0')}`;
}
