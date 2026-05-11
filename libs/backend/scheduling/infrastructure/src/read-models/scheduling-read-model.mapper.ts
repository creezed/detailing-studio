import type {
  BranchListItemReadModel,
  BranchScheduleReadModel,
  MasterScheduleReadModel,
  TimeRangeReadModel,
  UnavailabilityReadModel,
  WeeklyPatternDayReadModel,
  WorkingDayReadModel,
} from '@det/backend-scheduling-application';

import type { BranchScheduleSchema } from '../persistence/branch-schedule.schema';
import type { BranchSchema } from '../persistence/branch.schema';
import type { MasterScheduleSchema } from '../persistence/master-schedule.schema';
import type {
  TimeRangeRecord,
  UnavailabilityRecord,
  WeeklyPatternRecord,
  WorkingDayRecord,
} from '../persistence/scheduling-json.types';

export function branchToListItem(branch: BranchSchema): BranchListItemReadModel {
  return {
    address: branch.address,
    id: branch.id,
    isActive: branch.isActive,
    name: branch.name,
    timezone: branch.timezone,
  };
}

export function branchScheduleToReadModel(schedule: BranchScheduleSchema): BranchScheduleReadModel {
  return {
    branchId: schedule.branchId,
    exceptions: schedule.exceptions.getItems().map((exception) => ({
      customRange:
        exception.customRange === null ? null : timeRangeToReadModel(exception.customRange),
      date: exception.date,
      isClosed: exception.isClosed,
      reason: exception.reason,
    })),
    id: schedule.id,
    weeklyPattern: weeklyPatternToReadModel(schedule.weeklyPattern),
  };
}

export function masterScheduleToReadModel(schedule: MasterScheduleSchema): MasterScheduleReadModel {
  return {
    branchId: schedule.branchId,
    id: schedule.id,
    masterId: schedule.masterId,
    unavailabilities: schedule.unavailabilities.getItems().map((item) =>
      unavailabilityToReadModel({
        fromAt: item.fromAt.toISOString(),
        id: item.id,
        reason: item.reason,
        toAt: item.toAt.toISOString(),
      }),
    ),
    weeklyPattern: weeklyPatternToReadModel(schedule.weeklyPattern),
  };
}

function weeklyPatternToReadModel(
  pattern: readonly WeeklyPatternRecord[],
): readonly WeeklyPatternDayReadModel[] {
  return pattern.map((record) => ({
    dayOfWeek: record.dayOfWeek,
    workingDay: record.workingDay === null ? null : workingDayToReadModel(record.workingDay),
  }));
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

function unavailabilityToReadModel(record: UnavailabilityRecord): UnavailabilityReadModel {
  return {
    fromAt: record.fromAt,
    id: record.id,
    reason: record.reason,
    toAt: record.toAt,
  };
}

function timeOfDayToString(record: { readonly hour: number; readonly minute: number }): string {
  return `${String(record.hour).padStart(2, '0')}:${String(record.minute).padStart(2, '0')}`;
}
