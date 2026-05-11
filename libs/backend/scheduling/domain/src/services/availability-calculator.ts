import { DateTime } from '@det/backend-shared-ddd';

import { AppointmentStatus } from '../value-objects/appointment-status';
import { Duration } from '../value-objects/duration.value-object';
import { TimeOfDay } from '../value-objects/time-of-day.value-object';
import { TimeRange } from '../value-objects/time-range.value-object';
import { TimeSlot } from '../value-objects/time-slot.value-object';

import type { Appointment } from '../appointment/appointment.aggregate';
import type { BranchSchedule } from '../branch-schedule/branch-schedule.aggregate';
import type { MasterSchedule } from '../master-schedule/master-schedule.aggregate';
import type { BranchId } from '../value-objects/branch-id';
import type { MasterId } from '../value-objects/master-id';
import type { Timezone } from '../value-objects/timezone.value-object';

export interface AvailableSlot {
  readonly masterId: MasterId;
  readonly branchId: BranchId;
  readonly slot: TimeSlot;
}

export interface AvailabilityQuery {
  readonly branchSchedule: BranchSchedule;
  readonly masterSchedules: readonly MasterSchedule[];
  readonly existingAppointments: readonly Appointment[];
  readonly servicesDuration: Duration;
  readonly searchRange: { readonly from: Date; readonly to: Date };
  readonly gridStep?: Duration;
  readonly bufferBetween?: Duration;
  readonly masterId?: MasterId;
  readonly timezone: Timezone;
}

const BLOCKING_STATUSES = new Set<AppointmentStatus>([
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
]);

interface MinuteInterval {
  readonly startMin: number;
  readonly endMin: number;
}

export class AvailabilityCalculator {
  calculate(query: AvailabilityQuery): readonly AvailableSlot[] {
    const {
      branchSchedule,
      masterSchedules,
      existingAppointments,
      servicesDuration,
      searchRange,
      timezone,
      gridStep = Duration.minutes(15),
      bufferBetween = Duration.zero(),
      masterId: requestedMasterId,
    } = query;
    const serviceDurationMinutes = servicesDuration.minutes;
    const gridStepMinutes = gridStep.minutes;
    const bufferMinutes = bufferBetween.minutes;

    const result: AvailableSlot[] = [];

    const blockingAppointments = existingAppointments.filter((a) =>
      BLOCKING_STATUSES.has(a.status),
    );

    const appointmentsByMaster = new Map<string, MinuteInterval[]>();

    const days = AvailabilityCalculator.enumerateDayStartMs(searchRange.from, searchRange.to);

    const selectedMasterSchedules =
      requestedMasterId === undefined
        ? masterSchedules
        : masterSchedules.filter((m) => m.masterId === requestedMasterId);

    for (const master of selectedMasterSchedules) {
      const masterId = master.masterId;
      const branchId = master.branchId;

      const masterAppts = blockingAppointments.filter((a) => a.masterId === masterId);

      for (const dayStartMs of days) {
        const dayOfWeek = AvailabilityCalculator.isoDayOfWeek(dayStartMs);
        const dateStr = AvailabilityCalculator.formatDate(dayStartMs);

        const branchRanges = branchSchedule.workingHoursAt(dateStr, dayOfWeek);
        if (branchRanges.length === 0) continue;

        const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
        const dayStart = DateTime.from(dayStartMs);
        const dayEnd = DateTime.from(dayEndMs);

        const masterRanges = master.workingRangesOnDay(dayOfWeek, dayStart, dayEnd);
        if (masterRanges.length === 0) continue;

        const intersected = AvailabilityCalculator.intersectRangeLists(branchRanges, masterRanges);
        if (intersected.length === 0) continue;

        const masterApptKey = `${masterId}:${dateStr}`;
        let apptIntervals = appointmentsByMaster.get(masterApptKey);
        if (apptIntervals === undefined) {
          apptIntervals = AvailabilityCalculator.appointmentsToIntervals(
            masterAppts,
            dayStartMs,
            dayEndMs,
            bufferMinutes,
          );
          appointmentsByMaster.set(masterApptKey, apptIntervals);
        }

        const freeWindows = AvailabilityCalculator.subtractIntervals(
          intersected.map((r) => ({
            startMin: r.start.toMinutes(),
            endMin: r.end.toMinutes(),
          })),
          apptIntervals,
        );

        for (const window of freeWindows) {
          const windowDuration = window.endMin - window.startMin;
          if (windowDuration < serviceDurationMinutes) continue;

          for (
            let startMin = window.startMin;
            startMin + serviceDurationMinutes <= window.endMin;
            startMin += gridStepMinutes
          ) {
            const slotStartMs = dayStartMs + startMin * 60_000;
            const slotEndMs = dayStartMs + (startMin + serviceDurationMinutes) * 60_000;

            const slot = AvailabilityCalculator.makeTimeSlot(slotStartMs, slotEndMs, timezone);

            result.push({ masterId, branchId, slot });
          }
        }
      }
    }

    result.sort((a, b) => a.slot.start.toDate().getTime() - b.slot.start.toDate().getTime());

    return result;
  }

  private static enumerateDayStartMs(from: Date, to: Date): number[] {
    const days: number[] = [];
    const fromMs = from.getTime();
    const current = fromMs - (fromMs % (24 * 60 * 60 * 1000));

    const endMs = to.getTime();
    for (let dayStartMs = current; dayStartMs < endMs; dayStartMs += 24 * 60 * 60 * 1000) {
      days.push(dayStartMs);
    }
    return days;
  }

  private static isoDayOfWeek(dayStartMs: number): number {
    const daysSinceEpoch = Math.floor(dayStartMs / (24 * 60 * 60 * 1000));
    const jsDay = (daysSinceEpoch + 4) % 7;
    return jsDay === 0 ? 7 : jsDay;
  }

  private static formatDate(dayStartMs: number): string {
    return DateTime.from(dayStartMs).iso().slice(0, 10);
  }

  private static intersectRangeLists(
    listA: readonly TimeRange[],
    listB: readonly TimeRange[],
  ): TimeRange[] {
    const result: TimeRange[] = [];
    for (const a of listA) {
      for (const b of listB) {
        const startMin = Math.max(a.start.toMinutes(), b.start.toMinutes());
        const endMin = Math.min(a.end.toMinutes(), b.end.toMinutes());
        if (startMin < endMin) {
          result.push(
            TimeRange.from(
              TimeOfDay.from(Math.floor(startMin / 60), startMin % 60),
              TimeOfDay.from(Math.floor(endMin / 60), endMin % 60),
            ),
          );
        }
      }
    }
    return result;
  }

  private static appointmentsToIntervals(
    appointments: readonly Appointment[],
    dayStartMs: number,
    dayEndMs: number,
    bufferMinutes: number,
  ): MinuteInterval[] {
    const MS_PER_MIN = 60_000;
    const bufferMs = bufferMinutes * MS_PER_MIN;

    return appointments
      .filter((a) => {
        const apptStart = a.slot.start.toDate().getTime();
        const apptEnd = a.slot.end.toDate().getTime();
        return apptStart < dayEndMs && apptEnd > dayStartMs;
      })
      .map((a) => {
        const apptStartMs = a.slot.start.toDate().getTime() - bufferMs;
        const apptEndMs = a.slot.end.toDate().getTime() + bufferMs;
        const clampedStart = Math.max(apptStartMs, dayStartMs);
        const clampedEnd = Math.min(apptEndMs, dayEndMs);
        return {
          startMin: Math.floor((clampedStart - dayStartMs) / MS_PER_MIN),
          endMin: Math.ceil((clampedEnd - dayStartMs) / MS_PER_MIN),
        };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }

  private static subtractIntervals(
    windows: readonly MinuteInterval[],
    holes: readonly MinuteInterval[],
  ): MinuteInterval[] {
    if (holes.length === 0) return [...windows];

    const result: MinuteInterval[] = [];
    for (const window of windows) {
      let cursor = window.startMin;
      for (const hole of holes) {
        if (hole.endMin <= cursor) continue;
        if (hole.startMin >= window.endMin) break;

        const holeStart = Math.max(hole.startMin, window.startMin);
        if (cursor < holeStart) {
          result.push({ startMin: cursor, endMin: holeStart });
        }
        cursor = Math.max(cursor, Math.min(hole.endMin, window.endMin));
      }
      if (cursor < window.endMin) {
        result.push({ startMin: cursor, endMin: window.endMin });
      }
    }
    return result;
  }

  private static makeTimeSlot(startMs: number, endMs: number, timezone: Timezone): TimeSlot {
    return TimeSlot.from(DateTime.from(startMs), DateTime.from(endMs), timezone);
  }
}
