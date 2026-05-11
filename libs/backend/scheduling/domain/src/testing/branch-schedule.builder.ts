import { DateTime } from '@det/backend-shared-ddd';

import { FakeIdGenerator } from './fake-id-generator';
import { BranchSchedule } from '../branch-schedule/branch-schedule.aggregate';
import { DayOfWeek } from '../value-objects/day-of-week';
import { TimeOfDay } from '../value-objects/time-of-day.value-object';
import { WorkingDay } from '../value-objects/working-day.value-object';

import type {
  CreateBranchScheduleProps,
  WeeklyPattern,
} from '../branch-schedule/branch-schedule.aggregate';
import type { ScheduleException } from '../value-objects/schedule-exception.value-object';

function defaultWeeklyPattern(): WeeklyPattern {
  const open = TimeOfDay.from(9, 0);
  const close = TimeOfDay.from(18, 0);
  const breakStart = TimeOfDay.from(13, 0);
  const breakEnd = TimeOfDay.from(14, 0);
  const workingDay = WorkingDay.from({ open, close, breakStart, breakEnd });

  return new Map<DayOfWeek, WorkingDay | null>([
    [DayOfWeek.MONDAY, workingDay],
    [DayOfWeek.TUESDAY, workingDay],
    [DayOfWeek.WEDNESDAY, workingDay],
    [DayOfWeek.THURSDAY, workingDay],
    [DayOfWeek.FRIDAY, workingDay],
    [DayOfWeek.SATURDAY, null],
    [DayOfWeek.SUNDAY, null],
  ]);
}

const DEFAULT_BRANCH_ID = '00000000-0000-4000-a000-000000000099';

export class BranchScheduleBuilder {
  private _branchId: string = DEFAULT_BRANCH_ID;
  private _weeklyPattern: WeeklyPattern = defaultWeeklyPattern();
  private _exceptions: ScheduleException[] = [];
  private _idGen = new FakeIdGenerator();
  private _now = DateTime.from('2024-01-15T10:00:00Z');

  withBranchId(branchId: string): this {
    this._branchId = branchId;
    return this;
  }

  withWeeklyPattern(pattern: WeeklyPattern): this {
    this._weeklyPattern = pattern;
    return this;
  }

  withExceptions(exceptions: ScheduleException[]): this {
    this._exceptions = exceptions;
    return this;
  }

  withIdGen(idGen: FakeIdGenerator): this {
    this._idGen = idGen;
    return this;
  }

  withNow(now: DateTime): this {
    this._now = now;
    return this;
  }

  build(): BranchSchedule {
    const props: CreateBranchScheduleProps = {
      branchId: this._branchId,
      weeklyPattern: this._weeklyPattern,
      exceptions: this._exceptions,
      idGen: this._idGen,
      now: this._now,
    };
    return BranchSchedule.create(props);
  }
}
