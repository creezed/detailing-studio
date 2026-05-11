import type { DayOfWeek } from '@det/backend-scheduling-domain';

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
}

export interface TimeRangeReadModel {
  readonly start: string;
  readonly end: string;
}

export interface WorkingDayReadModel {
  readonly openAt: string;
  readonly closeAt: string;
  readonly breaks: readonly TimeRangeReadModel[];
}

export interface WeeklyPatternDayReadModel {
  readonly dayOfWeek: DayOfWeek;
  readonly workingDay: WorkingDayReadModel | null;
}

export interface ScheduleExceptionReadModel {
  readonly date: string;
  readonly isClosed: boolean;
  readonly customRange: TimeRangeReadModel | null;
  readonly reason: string | null;
}

export interface UnavailabilityReadModel {
  readonly id: string;
  readonly fromAt: string;
  readonly toAt: string;
  readonly reason: string;
}

export interface BranchScheduleReadModel {
  readonly id: string;
  readonly branchId: string;
  readonly weeklyPattern: readonly WeeklyPatternDayReadModel[];
  readonly exceptions: readonly ScheduleExceptionReadModel[];
}

export interface MasterScheduleReadModel {
  readonly id: string;
  readonly masterId: string;
  readonly branchId: string;
  readonly weeklyPattern: readonly WeeklyPatternDayReadModel[];
  readonly unavailabilities: readonly UnavailabilityReadModel[];
}

export interface BranchListItemReadModel {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly timezone: string;
  readonly isActive: boolean;
}

export interface BranchDetailReadModel extends BranchListItemReadModel {
  readonly schedule: BranchScheduleReadModel | null;
}

export interface BayReadModel {
  readonly id: string;
  readonly branchId: string;
  readonly name: string;
  readonly isActive: boolean;
}

export interface MasterReadModel {
  readonly masterId: string;
  readonly fullName: string;
  readonly schedule: MasterScheduleReadModel;
}
