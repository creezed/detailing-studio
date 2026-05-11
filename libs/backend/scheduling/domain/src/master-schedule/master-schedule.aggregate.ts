import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, IIdGenerator } from '@det/backend-shared-ddd';

import { UnavailabilityNotFoundError, UnavailabilityOverlapsError } from './master-schedule.errors';
import {
  MasterScheduleCreated,
  MasterScheduleUpdated,
  MasterUnavailabilityAdded,
  MasterUnavailabilityRemoved,
} from './master-schedule.events';
import { BranchId } from '../value-objects/branch-id';
import { MasterId } from '../value-objects/master-id';
import { ScheduleId } from '../value-objects/schedule-id';
import { TimeOfDay } from '../value-objects/time-of-day.value-object';
import { TimeRange } from '../value-objects/time-range.value-object';
import { UnavailabilityId } from '../value-objects/unavailability-id';
import { Unavailability } from '../value-objects/unavailability.value-object';

import type { DayOfWeek } from '../value-objects/day-of-week';
import type { WorkingDay } from '../value-objects/working-day.value-object';

export type MasterWeeklyPattern = ReadonlyMap<DayOfWeek, WorkingDay | null>;

export interface CreateMasterScheduleProps {
  readonly masterId: string;
  readonly branchId: string;
  readonly weeklyPattern: MasterWeeklyPattern;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface MasterScheduleSnapshot {
  readonly id: string;
  readonly masterId: string;
  readonly branchId: string;
  readonly weeklyPattern: ReadonlyMap<DayOfWeek, WorkingDay | null>;
  readonly unavailabilities: readonly Unavailability[];
}

export class MasterSchedule extends AggregateRoot<ScheduleId> {
  private constructor(
    private readonly _id: ScheduleId,
    private readonly _masterId: MasterId,
    private readonly _branchId: BranchId,
    private _weeklyPattern: Map<DayOfWeek, WorkingDay | null>,
    private readonly _unavailabilities: Unavailability[],
  ) {
    super();
  }

  override get id(): ScheduleId {
    return this._id;
  }

  get masterId(): MasterId {
    return this._masterId;
  }

  get branchId(): BranchId {
    return this._branchId;
  }

  static create(props: CreateMasterScheduleProps): MasterSchedule {
    const schedule = new MasterSchedule(
      ScheduleId.generate(props.idGen),
      MasterId.from(props.masterId),
      BranchId.from(props.branchId),
      new Map(props.weeklyPattern),
      [],
    );

    schedule.addEvent(
      new MasterScheduleCreated(schedule.id, schedule._masterId, schedule._branchId, props.now),
    );

    return schedule;
  }

  static restore(snapshot: MasterScheduleSnapshot): MasterSchedule {
    return new MasterSchedule(
      ScheduleId.from(snapshot.id),
      MasterId.from(snapshot.masterId),
      BranchId.from(snapshot.branchId),
      new Map(snapshot.weeklyPattern),
      [...snapshot.unavailabilities],
    );
  }

  replaceWeeklyPattern(newPattern: MasterWeeklyPattern, now: DateTime): void {
    this._weeklyPattern = new Map(newPattern);
    this.addEvent(new MasterScheduleUpdated(this.id, now));
  }

  addUnavailability(
    fromAt: DateTime,
    toAt: DateTime,
    reason: string,
    idGen: IIdGenerator,
    now: DateTime,
  ): UnavailabilityId {
    const unavailability = Unavailability.from({
      id: UnavailabilityId.generate(idGen),
      fromAt,
      toAt,
      reason,
    });

    for (const existing of this._unavailabilities) {
      if (existing.overlapsWith(unavailability)) {
        throw new UnavailabilityOverlapsError();
      }
    }

    this._unavailabilities.push(unavailability);
    this.addEvent(new MasterUnavailabilityAdded(this.id, unavailability.id, fromAt, toAt, now));

    return unavailability.id;
  }

  removeUnavailability(unavailabilityId: UnavailabilityId, now: DateTime): void {
    const idx = this._unavailabilities.findIndex((u) => u.id === unavailabilityId);
    if (idx === -1) {
      throw new UnavailabilityNotFoundError(unavailabilityId);
    }
    this._unavailabilities.splice(idx, 1);
    this.addEvent(new MasterUnavailabilityRemoved(this.id, unavailabilityId, now));
  }

  isAvailableAt(dayOfWeek: DayOfWeek, time: TimeOfDay, dt: DateTime): boolean {
    for (const unavailability of this._unavailabilities) {
      if (unavailability.containsTimestamp(dt)) {
        return false;
      }
    }

    const workingDay = this._weeklyPattern.get(dayOfWeek);
    if (workingDay == null) {
      return false;
    }

    return workingDay.containsTime(time);
  }

  workingRangesOnDay(
    dayOfWeek: DayOfWeek,
    dayStart: DateTime,
    dayEnd: DateTime,
  ): readonly TimeRange[] {
    const workingDay = this._weeklyPattern.get(dayOfWeek);
    if (workingDay == null) {
      return [];
    }

    const baseRanges = workingDay.toTimeRanges();

    const dayStartMs = dayStart.toDate().getTime();
    const dayEndMs = dayEnd.toDate().getTime();

    const overlapping = this._unavailabilities.filter((u) => {
      const uFrom = u.fromAt.toDate().getTime();
      const uTo = u.toAt.toDate().getTime();
      return uFrom < dayEndMs && uTo > dayStartMs;
    });

    if (overlapping.length === 0) {
      return baseRanges;
    }

    return baseRanges.flatMap((range) =>
      MasterSchedule.subtractUnavailabilities(range, overlapping, dayStart),
    );
  }

  toSnapshot(): MasterScheduleSnapshot {
    return {
      id: this.id,
      masterId: this._masterId,
      branchId: this._branchId,
      weeklyPattern: new Map(this._weeklyPattern),
      unavailabilities: [...this._unavailabilities],
    };
  }

  private static subtractUnavailabilities(
    range: TimeRange,
    unavailabilities: readonly Unavailability[],
    dayStart: DateTime,
  ): TimeRange[] {
    const dayStartMs = dayStart.toDate().getTime();
    const MS_PER_MINUTE = 60_000;

    interface Interval {
      startMin: number;
      endMin: number;
    }

    const baseInterval: Interval = {
      startMin: range.start.toMinutes(),
      endMin: range.end.toMinutes(),
    };

    const holes: Interval[] = unavailabilities
      .map((u) => ({
        startMin: Math.floor((u.fromAt.toDate().getTime() - dayStartMs) / MS_PER_MINUTE),
        endMin: Math.floor((u.toAt.toDate().getTime() - dayStartMs) / MS_PER_MINUTE),
      }))
      .filter((h) => h.startMin < baseInterval.endMin && h.endMin > baseInterval.startMin)
      .sort((a, b) => a.startMin - b.startMin);

    if (holes.length === 0) {
      return [range];
    }

    const result: TimeRange[] = [];
    let cursor = baseInterval.startMin;

    for (const hole of holes) {
      const holeStart = Math.max(hole.startMin, baseInterval.startMin);
      const holeEnd = Math.min(hole.endMin, baseInterval.endMin);

      if (cursor < holeStart) {
        result.push(
          TimeRange.from(
            TimeOfDay.from(Math.floor(cursor / 60), cursor % 60),
            TimeOfDay.from(Math.floor(holeStart / 60), holeStart % 60),
          ),
        );
      }
      cursor = Math.max(cursor, holeEnd);
    }

    if (cursor < baseInterval.endMin) {
      result.push(
        TimeRange.from(
          TimeOfDay.from(Math.floor(cursor / 60), cursor % 60),
          TimeOfDay.from(Math.floor(baseInterval.endMin / 60), baseInterval.endMin % 60),
        ),
      );
    }

    return result;
  }
}
