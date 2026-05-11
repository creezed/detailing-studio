import { DateTime } from '@det/backend-shared-ddd';

import { FakeIdGenerator } from './fake-id-generator';
import { MasterSchedule } from '../master-schedule/master-schedule.aggregate';
import { DayOfWeek } from '../value-objects/day-of-week';
import { TimeOfDay } from '../value-objects/time-of-day.value-object';
import { WorkingDay } from '../value-objects/working-day.value-object';

import type {
  CreateMasterScheduleProps,
  MasterWeeklyPattern,
} from '../master-schedule/master-schedule.aggregate';

function defaultMasterWeeklyPattern(): MasterWeeklyPattern {
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

const DEFAULT_MASTER_ID = '00000000-0000-4000-a000-000000000010';
const DEFAULT_BRANCH_ID = '00000000-0000-4000-a000-000000000099';

export class MasterScheduleBuilder {
  private _masterId: string = DEFAULT_MASTER_ID;
  private _branchId: string = DEFAULT_BRANCH_ID;
  private _weeklyPattern: MasterWeeklyPattern = defaultMasterWeeklyPattern();
  private _idGen = new FakeIdGenerator();
  private _now = DateTime.from('2024-01-15T10:00:00Z');

  withMasterId(masterId: string): this {
    this._masterId = masterId;
    return this;
  }

  withBranchId(branchId: string): this {
    this._branchId = branchId;
    return this;
  }

  withWeeklyPattern(pattern: MasterWeeklyPattern): this {
    this._weeklyPattern = pattern;
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

  build(): MasterSchedule {
    const props: CreateMasterScheduleProps = {
      masterId: this._masterId,
      branchId: this._branchId,
      weeklyPattern: this._weeklyPattern,
      idGen: this._idGen,
      now: this._now,
    };
    return MasterSchedule.create(props);
  }
}
