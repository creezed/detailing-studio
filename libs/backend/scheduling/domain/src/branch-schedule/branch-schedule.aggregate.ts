import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, IIdGenerator } from '@det/backend-shared-ddd';

import { DuplicateExceptionDateError, ExceptionNotFoundError } from './branch-schedule.errors';
import {
  BranchScheduleExceptionAdded,
  BranchScheduleExceptionRemoved,
  BranchScheduleSet,
} from './branch-schedule.events';
import { BranchId } from '../value-objects/branch-id';
import { ScheduleId } from '../value-objects/schedule-id';

import type { DayOfWeek } from '../value-objects/day-of-week';
import type { ScheduleException } from '../value-objects/schedule-exception.value-object';
import type { TimeOfDay } from '../value-objects/time-of-day.value-object';
import type { TimeRange } from '../value-objects/time-range.value-object';
import type { WorkingDay } from '../value-objects/working-day.value-object';

export type WeeklyPattern = ReadonlyMap<DayOfWeek, WorkingDay | null>;

export interface CreateBranchScheduleProps {
  readonly branchId: string;
  readonly weeklyPattern: WeeklyPattern;
  readonly exceptions?: readonly ScheduleException[];
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface BranchScheduleSnapshot {
  readonly id: string;
  readonly branchId: string;
  readonly weeklyPattern: ReadonlyMap<DayOfWeek, WorkingDay | null>;
  readonly exceptions: readonly ScheduleException[];
}

export class BranchSchedule extends AggregateRoot<ScheduleId> {
  private constructor(
    private readonly _id: ScheduleId,
    private readonly _branchId: BranchId,
    private _weeklyPattern: Map<DayOfWeek, WorkingDay | null>,
    private readonly _exceptions: ScheduleException[],
  ) {
    super();
  }

  override get id(): ScheduleId {
    return this._id;
  }

  get branchId(): BranchId {
    return this._branchId;
  }

  static create(props: CreateBranchScheduleProps): BranchSchedule {
    const exceptions = props.exceptions ? [...props.exceptions] : [];
    BranchSchedule.validateUniqueExceptionDates(exceptions);

    const schedule = new BranchSchedule(
      ScheduleId.generate(props.idGen),
      BranchId.from(props.branchId),
      new Map(props.weeklyPattern),
      exceptions,
    );

    schedule.addEvent(new BranchScheduleSet(schedule.id, schedule._branchId, props.now));

    return schedule;
  }

  static restore(snapshot: BranchScheduleSnapshot): BranchSchedule {
    return new BranchSchedule(
      ScheduleId.from(snapshot.id),
      BranchId.from(snapshot.branchId),
      new Map(snapshot.weeklyPattern),
      [...snapshot.exceptions],
    );
  }

  replaceWeeklyPattern(newPattern: WeeklyPattern, now: DateTime): void {
    this._weeklyPattern = new Map(newPattern);
    this.addEvent(new BranchScheduleSet(this.id, this._branchId, now));
  }

  addException(exception: ScheduleException, now: DateTime): void {
    if (this._exceptions.some((e) => e.date === exception.date)) {
      throw new DuplicateExceptionDateError(exception.date);
    }
    this._exceptions.push(exception);
    this.addEvent(new BranchScheduleExceptionAdded(this.id, exception.date, now));
  }

  removeException(date: string, now: DateTime): void {
    const idx = this._exceptions.findIndex((e) => e.date === date);
    if (idx === -1) {
      throw new ExceptionNotFoundError(date);
    }
    this._exceptions.splice(idx, 1);
    this.addEvent(new BranchScheduleExceptionRemoved(this.id, date, now));
  }

  isOpenAt(date: string, dayOfWeek: DayOfWeek, time: TimeOfDay): boolean {
    const exception = this._exceptions.find((e) => e.date === date);

    if (exception !== undefined) {
      if (exception.isClosed) {
        return false;
      }
      if (exception.customRange !== null) {
        return exception.customRange.contains(time);
      }
    }

    const workingDay = this._weeklyPattern.get(dayOfWeek);
    if (workingDay == null) {
      return false;
    }

    return workingDay.containsTime(time);
  }

  workingHoursAt(date: string, dayOfWeek: DayOfWeek): readonly TimeRange[] {
    const exception = this._exceptions.find((e) => e.date === date);

    if (exception !== undefined) {
      if (exception.isClosed) {
        return [];
      }
      if (exception.customRange !== null) {
        return [exception.customRange];
      }
    }

    const workingDay = this._weeklyPattern.get(dayOfWeek);
    if (workingDay == null) {
      return [];
    }

    return workingDay.toTimeRanges();
  }

  toSnapshot(): BranchScheduleSnapshot {
    return {
      id: this.id,
      branchId: this._branchId,
      weeklyPattern: new Map(this._weeklyPattern),
      exceptions: [...this._exceptions],
    };
  }

  private static validateUniqueExceptionDates(exceptions: readonly ScheduleException[]): void {
    const dates = new Set<string>();
    for (const ex of exceptions) {
      if (dates.has(ex.date)) {
        throw new DuplicateExceptionDateError(ex.date);
      }
      dates.add(ex.date);
    }
  }
}
