import {
  ScheduleException,
  TimeOfDay,
  TimeRange,
  WorkingDay,
} from '@det/backend-scheduling-application';
import type {
  WeeklyPattern,
  MasterWeeklyPattern,
  DayOfWeek,
} from '@det/backend-scheduling-application';

import type {
  AddScheduleExceptionRequestDto,
  WeeklyPatternDayDto,
  WorkingDayDto,
} from '../dto/schedule.dto';

function toDomainTimeOfDay(time: string): TimeOfDay {
  const [hourStr, minuteStr] = time.split(':');
  return TimeOfDay.from(Number(hourStr), Number(minuteStr));
}

function toDomainWorkingDay(dto: WorkingDayDto): WorkingDay {
  const open = toDomainTimeOfDay(dto.openAt);
  const close = toDomainTimeOfDay(dto.closeAt);
  const breaks = dto.breaks ?? [];
  const firstBreak = breaks[0];
  const breakStart = firstBreak != null ? toDomainTimeOfDay(firstBreak.start) : null;
  const breakEnd = firstBreak != null ? toDomainTimeOfDay(firstBreak.end) : null;

  return WorkingDay.from({ open, close, breakStart, breakEnd });
}

export function toDomainWeeklyPattern(days: readonly WeeklyPatternDayDto[]): WeeklyPattern {
  const pattern = new Map<DayOfWeek, WorkingDay | null>();

  for (const day of days) {
    const dayOfWeek = day.dayOfWeek;
    pattern.set(dayOfWeek, day.workingDay != null ? toDomainWorkingDay(day.workingDay) : null);
  }

  return pattern;
}

export function toDomainMasterWeeklyPattern(
  days: readonly WeeklyPatternDayDto[],
): MasterWeeklyPattern {
  return toDomainWeeklyPattern(days);
}

export function toDomainScheduleException(dto: AddScheduleExceptionRequestDto): ScheduleException {
  const customRange =
    dto.customRange != null
      ? TimeRange.from(
          toDomainTimeOfDay(dto.customRange.start),
          toDomainTimeOfDay(dto.customRange.end),
        )
      : null;

  return ScheduleException.from({
    date: dto.date,
    isClosed: dto.isClosed,
    customRange,
    reason: dto.reason,
  });
}
