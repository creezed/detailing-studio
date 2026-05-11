import { DateTime } from '@det/backend-shared-ddd';

import { BranchSchedule } from './branch-schedule.aggregate';
import { DuplicateExceptionDateError, ExceptionNotFoundError } from './branch-schedule.errors';
import {
  BranchScheduleExceptionAdded,
  BranchScheduleExceptionRemoved,
  BranchScheduleSet,
} from './branch-schedule.events';
import { BranchScheduleBuilder } from '../testing/branch-schedule.builder';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { DayOfWeek } from '../value-objects/day-of-week';
import { ScheduleException } from '../value-objects/schedule-exception.value-object';
import { TimeOfDay } from '../value-objects/time-of-day.value-object';
import { TimeRange } from '../value-objects/time-range.value-object';
import { WorkingDay } from '../value-objects/working-day.value-object';

const NOW = DateTime.from('2024-01-15T10:00:00Z');
const LATER = DateTime.from('2024-01-15T12:00:00Z');

describe('BranchSchedule aggregate', () => {
  const idGen = new FakeIdGenerator();

  describe('create', () => {
    it('should create a schedule and emit BranchScheduleSet', () => {
      const schedule = new BranchScheduleBuilder().withIdGen(idGen).withNow(NOW).build();

      expect(schedule.branchId).toBe('00000000-0000-4000-a000-000000000099');

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchScheduleSet);
    });

    it('should reject duplicate exception dates on create', () => {
      const ex1 = ScheduleException.from({ date: '2024-01-20', isClosed: true });
      const ex2 = ScheduleException.from({
        date: '2024-01-20',
        isClosed: false,
        customRange: TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(14, 0)),
      });

      expect(() => new BranchScheduleBuilder().withExceptions([ex1, ex2]).build()).toThrow(
        DuplicateExceptionDateError,
      );
    });
  });

  describe('replaceWeeklyPattern', () => {
    it('should replace pattern and emit BranchScheduleSet', () => {
      const schedule = new BranchScheduleBuilder().build();
      schedule.pullDomainEvents();

      const newPattern = new Map<DayOfWeek, WorkingDay | null>([
        [
          DayOfWeek.MONDAY,
          WorkingDay.from({ open: TimeOfDay.from(8, 0), close: TimeOfDay.from(20, 0) }),
        ],
      ]);

      schedule.replaceWeeklyPattern(newPattern, LATER);

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchScheduleSet);
    });
  });

  describe('addException', () => {
    it('should add exception and emit event', () => {
      const schedule = new BranchScheduleBuilder().build();
      schedule.pullDomainEvents();

      const exception = ScheduleException.from({
        date: '2024-12-31',
        isClosed: true,
        reason: 'New Year Eve',
      });
      schedule.addException(exception, LATER);

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchScheduleExceptionAdded);
      expect((events[0] as BranchScheduleExceptionAdded).date).toBe('2024-12-31');
    });

    it('should reject duplicate exception date', () => {
      const schedule = new BranchScheduleBuilder().build();
      const exception = ScheduleException.from({ date: '2024-12-31', isClosed: true });
      schedule.addException(exception, LATER);

      expect(() => {
        schedule.addException(
          ScheduleException.from({ date: '2024-12-31', isClosed: true }),
          LATER,
        );
      }).toThrow(DuplicateExceptionDateError);
    });
  });

  describe('removeException', () => {
    it('should remove exception and emit event', () => {
      const schedule = new BranchScheduleBuilder().build();
      const exception = ScheduleException.from({ date: '2024-12-31', isClosed: true });
      schedule.addException(exception, LATER);
      schedule.pullDomainEvents();

      schedule.removeException('2024-12-31', LATER);

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BranchScheduleExceptionRemoved);
    });

    it('should throw when exception not found', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(() => {
        schedule.removeException('2099-01-01', LATER);
      }).toThrow(ExceptionNotFoundError);
    });
  });

  describe('isOpenAt', () => {
    it('should return true on a working day during working hours', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(10, 30))).toBe(true);
    });

    it('should return false during lunch break', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(13, 30))).toBe(false);
    });

    it('should return false on a day with null pattern (weekend)', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(schedule.isOpenAt('2024-01-20', DayOfWeek.SATURDAY, TimeOfDay.from(10, 0))).toBe(
        false,
      );
    });

    it('should return false before open time', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(8, 0))).toBe(false);
    });

    it('should return false at close time (exclusive end)', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(18, 0))).toBe(false);
    });

    it('should return true at open time (inclusive start)', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(9, 0))).toBe(true);
    });

    it('should return false on a closed exception date regardless of weekly', () => {
      const schedule = new BranchScheduleBuilder().build();
      const exception = ScheduleException.from({
        date: '2024-01-15',
        isClosed: true,
        reason: 'Holiday',
      });
      schedule.addException(exception, LATER);

      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(10, 0))).toBe(false);
    });

    it('should use customRange from exception instead of weekly', () => {
      const schedule = new BranchScheduleBuilder().build();
      const customRange = TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(14, 0));
      const exception = ScheduleException.from({
        date: '2024-01-15',
        isClosed: false,
        customRange,
        reason: 'Short day',
      });
      schedule.addException(exception, LATER);

      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(11, 0))).toBe(true);
      expect(schedule.isOpenAt('2024-01-15', DayOfWeek.MONDAY, TimeOfDay.from(15, 0))).toBe(false);
    });

    it('should return true on exception custom range even on a normally closed day', () => {
      const schedule = new BranchScheduleBuilder().build();
      const customRange = TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(14, 0));
      const exception = ScheduleException.from({
        date: '2024-01-20',
        isClosed: false,
        customRange,
      });
      schedule.addException(exception, LATER);

      expect(schedule.isOpenAt('2024-01-20', DayOfWeek.SATURDAY, TimeOfDay.from(11, 0))).toBe(true);
    });
  });

  describe('workingHoursAt', () => {
    it('should return ranges split around break on a working day', () => {
      const schedule = new BranchScheduleBuilder().build();
      const ranges = schedule.workingHoursAt('2024-01-15', DayOfWeek.MONDAY);

      expect(ranges).toHaveLength(2);
      const [first, second] = ranges;
      expect(first?.start.equals(TimeOfDay.from(9, 0))).toBe(true);
      expect(first?.end.equals(TimeOfDay.from(13, 0))).toBe(true);
      expect(second?.start.equals(TimeOfDay.from(14, 0))).toBe(true);
      expect(second?.end.equals(TimeOfDay.from(18, 0))).toBe(true);
    });

    it('should return empty array on weekend', () => {
      const schedule = new BranchScheduleBuilder().build();
      expect(schedule.workingHoursAt('2024-01-20', DayOfWeek.SATURDAY)).toEqual([]);
    });

    it('should return empty array on closed exception', () => {
      const schedule = new BranchScheduleBuilder().build();
      schedule.addException(ScheduleException.from({ date: '2024-01-15', isClosed: true }), LATER);
      expect(schedule.workingHoursAt('2024-01-15', DayOfWeek.MONDAY)).toEqual([]);
    });

    it('should return custom range from exception', () => {
      const schedule = new BranchScheduleBuilder().build();
      const customRange = TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(14, 0));
      schedule.addException(
        ScheduleException.from({ date: '2024-01-15', isClosed: false, customRange }),
        LATER,
      );

      const ranges = schedule.workingHoursAt('2024-01-15', DayOfWeek.MONDAY);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]?.equals(customRange)).toBe(true);
    });

    it('should return single range for working day without break', () => {
      const pattern = new Map<DayOfWeek, WorkingDay | null>([
        [
          DayOfWeek.MONDAY,
          WorkingDay.from({ open: TimeOfDay.from(9, 0), close: TimeOfDay.from(18, 0) }),
        ],
      ]);
      const schedule = new BranchScheduleBuilder().withWeeklyPattern(pattern).build();

      const ranges = schedule.workingHoursAt('2024-01-15', DayOfWeek.MONDAY);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]?.start.equals(TimeOfDay.from(9, 0))).toBe(true);
      expect(ranges[0]?.end.equals(TimeOfDay.from(18, 0))).toBe(true);
    });
  });

  describe('restore', () => {
    it('should restore from snapshot without events', () => {
      const original = new BranchScheduleBuilder().build();
      const snapshot = original.toSnapshot();

      const restored = BranchSchedule.restore(snapshot);

      expect(restored.id).toBe(original.id);
      expect(restored.branchId).toBe(original.branchId);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });
});
