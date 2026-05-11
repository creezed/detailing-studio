import { InvalidAddressError, Address } from './address.value-object';
import { BayId } from './bay-id';
import { BranchId } from './branch-id';
import { InvalidBranchNameError, BranchName } from './branch-name.value-object';
import { DayOfWeek } from './day-of-week';
import { Duration, InvalidDurationError } from './duration.value-object';
import {
  ScheduleException,
  InvalidScheduleExceptionError,
} from './schedule-exception.value-object';
import { ScheduleId } from './schedule-id';
import { InvalidTimeOfDayError, TimeOfDay } from './time-of-day.value-object';
import { InvalidTimeRangeError, TimeRange } from './time-range.value-object';
import { InvalidTimezoneError, Timezone } from './timezone.value-object';
import { InvalidWorkingDayError, WorkingDay } from './working-day.value-object';
import { FakeIdGenerator } from '../testing/fake-id-generator';

describe('Value Objects', () => {
  describe('BranchId', () => {
    it('should create from valid UUID', () => {
      const id = BranchId.from('00000000-0000-4000-a000-000000000001');
      expect(id).toBe('00000000-0000-4000-a000-000000000001');
    });

    it('should generate with IdGenerator', () => {
      const idGen = new FakeIdGenerator('00000000-0000-4000-a000-000000000002');
      const id = BranchId.generate(idGen);
      expect(id).toBe('00000000-0000-4000-a000-000000000002');
    });

    it('should reject invalid UUID', () => {
      expect(() => BranchId.from('not-a-uuid')).toThrow();
    });
  });

  describe('BayId', () => {
    it('should create from valid UUID', () => {
      const id = BayId.from('00000000-0000-4000-a000-000000000003');
      expect(id).toBe('00000000-0000-4000-a000-000000000003');
    });

    it('should generate with IdGenerator', () => {
      const idGen = new FakeIdGenerator('00000000-0000-4000-a000-000000000004');
      const id = BayId.generate(idGen);
      expect(id).toBe('00000000-0000-4000-a000-000000000004');
    });
  });

  describe('ScheduleId', () => {
    it('should create from valid UUID', () => {
      const id = ScheduleId.from('00000000-0000-4000-a000-000000000005');
      expect(id).toBe('00000000-0000-4000-a000-000000000005');
    });

    it('should generate with IdGenerator', () => {
      const idGen = new FakeIdGenerator('00000000-0000-4000-a000-000000000006');
      const id = ScheduleId.generate(idGen);
      expect(id).toBe('00000000-0000-4000-a000-000000000006');
    });
  });

  describe('Duration', () => {
    it('should create duration in minutes', () => {
      expect(Duration.minutes(90).minutes).toBe(90);
    });

    it('should create zero duration', () => {
      expect(Duration.zero().minutes).toBe(0);
    });

    it('should reject negative, fractional and non-finite minutes', () => {
      expect(() => Duration.minutes(-1)).toThrow(InvalidDurationError);
      expect(() => Duration.minutes(1.5)).toThrow(InvalidDurationError);
      expect(() => Duration.minutes(Number.NaN)).toThrow(InvalidDurationError);
    });
  });

  describe('BranchName', () => {
    it('should create from valid string', () => {
      const name = BranchName.from('Main');
      expect(name.getValue()).toBe('Main');
    });

    it('should trim whitespace', () => {
      const name = BranchName.from('  Main  ');
      expect(name.getValue()).toBe('Main');
    });

    it('should reject empty string', () => {
      expect(() => BranchName.from('')).toThrow(InvalidBranchNameError);
    });

    it('should reject whitespace-only string', () => {
      expect(() => BranchName.from('   ')).toThrow(InvalidBranchNameError);
    });

    it('should reject string longer than 120 chars', () => {
      expect(() => BranchName.from('x'.repeat(121))).toThrow(InvalidBranchNameError);
    });

    it('should accept exactly 120 chars', () => {
      const name = BranchName.from('x'.repeat(120));
      expect(name.getValue()).toBe('x'.repeat(120));
    });

    it('should support equals', () => {
      expect(BranchName.from('A').equals(BranchName.from('A'))).toBe(true);
      expect(BranchName.from('A').equals(BranchName.from('B'))).toBe(false);
    });

    it('should support toString', () => {
      expect(BranchName.from('Main').toString()).toBe('Main');
    });
  });

  describe('Address', () => {
    it('should create from valid string', () => {
      const addr = Address.from('ул. Пушкина, 1');
      expect(addr.getValue()).toBe('ул. Пушкина, 1');
    });

    it('should trim whitespace', () => {
      expect(Address.from('  test  ').getValue()).toBe('test');
    });

    it('should reject empty string', () => {
      expect(() => Address.from('')).toThrow(InvalidAddressError);
    });

    it('should reject whitespace-only string', () => {
      expect(() => Address.from('   ')).toThrow(InvalidAddressError);
    });

    it('should support equals', () => {
      expect(Address.from('A').equals(Address.from('A'))).toBe(true);
      expect(Address.from('A').equals(Address.from('B'))).toBe(false);
    });

    it('should support toString', () => {
      expect(Address.from('Main St').toString()).toBe('Main St');
    });
  });

  describe('Timezone', () => {
    it('should create from valid IANA timezone', () => {
      const tz = Timezone.from('Europe/Moscow');
      expect(tz.getValue()).toBe('Europe/Moscow');
    });

    it('should reject invalid timezone', () => {
      expect(() => Timezone.from('Invalid/Zone')).toThrow(InvalidTimezoneError);
    });

    it('should support equals', () => {
      expect(Timezone.from('Europe/Moscow').equals(Timezone.from('Europe/Moscow'))).toBe(true);
      expect(Timezone.from('Europe/Moscow').equals(Timezone.from('Asia/Tokyo'))).toBe(false);
    });

    it('should support toString', () => {
      expect(Timezone.from('Europe/Moscow').toString()).toBe('Europe/Moscow');
    });
  });

  describe('DayOfWeek', () => {
    it('should have correct ISO values', () => {
      expect(DayOfWeek.MONDAY).toBe(1);
      expect(DayOfWeek.SUNDAY).toBe(7);
    });
  });

  describe('TimeOfDay', () => {
    it('should create from valid values', () => {
      const t = TimeOfDay.from(9, 30);
      expect(t.hour).toBe(9);
      expect(t.minute).toBe(30);
    });

    it('should reject hour < 0', () => {
      expect(() => TimeOfDay.from(-1, 0)).toThrow(InvalidTimeOfDayError);
    });

    it('should reject hour > 23', () => {
      expect(() => TimeOfDay.from(24, 0)).toThrow(InvalidTimeOfDayError);
    });

    it('should reject minute < 0', () => {
      expect(() => TimeOfDay.from(0, -1)).toThrow(InvalidTimeOfDayError);
    });

    it('should reject minute > 59', () => {
      expect(() => TimeOfDay.from(0, 60)).toThrow(InvalidTimeOfDayError);
    });

    it('should reject non-integer hour', () => {
      expect(() => TimeOfDay.from(9.5, 0)).toThrow(InvalidTimeOfDayError);
    });

    it('should reject non-integer minute', () => {
      expect(() => TimeOfDay.from(9, 0.5)).toThrow(InvalidTimeOfDayError);
    });

    it('should calculate toMinutes', () => {
      expect(TimeOfDay.from(9, 30).toMinutes()).toBe(570);
      expect(TimeOfDay.from(0, 0).toMinutes()).toBe(0);
    });

    it('should compare with isBefore / isAfter', () => {
      const t1 = TimeOfDay.from(9, 0);
      const t2 = TimeOfDay.from(10, 0);
      expect(t1.isBefore(t2)).toBe(true);
      expect(t2.isBefore(t1)).toBe(false);
      expect(t2.isAfter(t1)).toBe(true);
      expect(t1.isAfter(t2)).toBe(false);
    });

    it('should support equals', () => {
      expect(TimeOfDay.from(9, 0).equals(TimeOfDay.from(9, 0))).toBe(true);
      expect(TimeOfDay.from(9, 0).equals(TimeOfDay.from(9, 1))).toBe(false);
    });

    it('should format toString', () => {
      expect(TimeOfDay.from(9, 5).toString()).toBe('09:05');
      expect(TimeOfDay.from(13, 30).toString()).toBe('13:30');
    });

    it('should accept boundary values 0:0 and 23:59', () => {
      expect(TimeOfDay.from(0, 0).hour).toBe(0);
      expect(TimeOfDay.from(23, 59).hour).toBe(23);
    });
  });

  describe('TimeRange', () => {
    it('should create from valid start < end', () => {
      const range = TimeRange.from(TimeOfDay.from(9, 0), TimeOfDay.from(18, 0));
      expect(range.start.hour).toBe(9);
      expect(range.end.hour).toBe(18);
    });

    it('should reject start >= end', () => {
      expect(() => TimeRange.from(TimeOfDay.from(18, 0), TimeOfDay.from(9, 0))).toThrow(
        InvalidTimeRangeError,
      );
    });

    it('should reject start == end', () => {
      expect(() => TimeRange.from(TimeOfDay.from(9, 0), TimeOfDay.from(9, 0))).toThrow(
        InvalidTimeRangeError,
      );
    });

    it('should check contains (inclusive start, exclusive end)', () => {
      const range = TimeRange.from(TimeOfDay.from(9, 0), TimeOfDay.from(18, 0));
      expect(range.contains(TimeOfDay.from(9, 0))).toBe(true);
      expect(range.contains(TimeOfDay.from(12, 0))).toBe(true);
      expect(range.contains(TimeOfDay.from(18, 0))).toBe(false);
      expect(range.contains(TimeOfDay.from(8, 59))).toBe(false);
    });

    it('should calculate durationMinutes', () => {
      const range = TimeRange.from(TimeOfDay.from(9, 0), TimeOfDay.from(18, 0));
      expect(range.durationMinutes()).toBe(540);
    });

    it('should support equals', () => {
      const r1 = TimeRange.from(TimeOfDay.from(9, 0), TimeOfDay.from(18, 0));
      const r2 = TimeRange.from(TimeOfDay.from(9, 0), TimeOfDay.from(18, 0));
      const r3 = TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(18, 0));
      expect(r1.equals(r2)).toBe(true);
      expect(r1.equals(r3)).toBe(false);
    });

    it('should format toString', () => {
      const range = TimeRange.from(TimeOfDay.from(9, 0), TimeOfDay.from(18, 0));
      expect(range.toString()).toBe('09:00-18:00');
    });
  });

  describe('WorkingDay', () => {
    it('should create without break', () => {
      const wd = WorkingDay.from({ open: TimeOfDay.from(9, 0), close: TimeOfDay.from(18, 0) });
      expect(wd.breakStart).toBeNull();
      expect(wd.breakEnd).toBeNull();
    });

    it('should create with break', () => {
      const wd = WorkingDay.from({
        open: TimeOfDay.from(9, 0),
        close: TimeOfDay.from(18, 0),
        breakStart: TimeOfDay.from(13, 0),
        breakEnd: TimeOfDay.from(14, 0),
      });
      expect(wd.breakStart).not.toBeNull();
    });

    it('should reject open >= close', () => {
      expect(() =>
        WorkingDay.from({ open: TimeOfDay.from(18, 0), close: TimeOfDay.from(9, 0) }),
      ).toThrow(InvalidWorkingDayError);
    });

    it('should reject only breakStart without breakEnd', () => {
      expect(() =>
        WorkingDay.from({
          open: TimeOfDay.from(9, 0),
          close: TimeOfDay.from(18, 0),
          breakStart: TimeOfDay.from(13, 0),
        }),
      ).toThrow(InvalidWorkingDayError);
    });

    it('should reject only breakEnd without breakStart', () => {
      expect(() =>
        WorkingDay.from({
          open: TimeOfDay.from(9, 0),
          close: TimeOfDay.from(18, 0),
          breakEnd: TimeOfDay.from(14, 0),
        }),
      ).toThrow(InvalidWorkingDayError);
    });

    it('should reject breakStart >= breakEnd', () => {
      expect(() =>
        WorkingDay.from({
          open: TimeOfDay.from(9, 0),
          close: TimeOfDay.from(18, 0),
          breakStart: TimeOfDay.from(14, 0),
          breakEnd: TimeOfDay.from(13, 0),
        }),
      ).toThrow(InvalidWorkingDayError);
    });

    it('should reject breakStart <= open', () => {
      expect(() =>
        WorkingDay.from({
          open: TimeOfDay.from(9, 0),
          close: TimeOfDay.from(18, 0),
          breakStart: TimeOfDay.from(9, 0),
          breakEnd: TimeOfDay.from(10, 0),
        }),
      ).toThrow(InvalidWorkingDayError);
    });

    it('should reject breakEnd >= close', () => {
      expect(() =>
        WorkingDay.from({
          open: TimeOfDay.from(9, 0),
          close: TimeOfDay.from(18, 0),
          breakStart: TimeOfDay.from(17, 0),
          breakEnd: TimeOfDay.from(18, 0),
        }),
      ).toThrow(InvalidWorkingDayError);
    });

    it('should return single range without break', () => {
      const wd = WorkingDay.from({ open: TimeOfDay.from(9, 0), close: TimeOfDay.from(18, 0) });
      const ranges = wd.toTimeRanges();
      expect(ranges).toHaveLength(1);
      expect(ranges[0]?.start.equals(TimeOfDay.from(9, 0))).toBe(true);
      expect(ranges[0]?.end.equals(TimeOfDay.from(18, 0))).toBe(true);
    });

    it('should return two ranges with break', () => {
      const wd = WorkingDay.from({
        open: TimeOfDay.from(9, 0),
        close: TimeOfDay.from(18, 0),
        breakStart: TimeOfDay.from(13, 0),
        breakEnd: TimeOfDay.from(14, 0),
      });
      const ranges = wd.toTimeRanges();
      expect(ranges).toHaveLength(2);
    });

    it('containsTime should return true during working hours', () => {
      const wd = WorkingDay.from({
        open: TimeOfDay.from(9, 0),
        close: TimeOfDay.from(18, 0),
        breakStart: TimeOfDay.from(13, 0),
        breakEnd: TimeOfDay.from(14, 0),
      });
      expect(wd.containsTime(TimeOfDay.from(10, 0))).toBe(true);
      expect(wd.containsTime(TimeOfDay.from(15, 0))).toBe(true);
    });

    it('containsTime should return false during break', () => {
      const wd = WorkingDay.from({
        open: TimeOfDay.from(9, 0),
        close: TimeOfDay.from(18, 0),
        breakStart: TimeOfDay.from(13, 0),
        breakEnd: TimeOfDay.from(14, 0),
      });
      expect(wd.containsTime(TimeOfDay.from(13, 30))).toBe(false);
    });

    it('should support equals', () => {
      const wd1 = WorkingDay.from({ open: TimeOfDay.from(9, 0), close: TimeOfDay.from(18, 0) });
      const wd2 = WorkingDay.from({ open: TimeOfDay.from(9, 0), close: TimeOfDay.from(18, 0) });
      const wd3 = WorkingDay.from({ open: TimeOfDay.from(10, 0), close: TimeOfDay.from(18, 0) });
      expect(wd1.equals(wd2)).toBe(true);
      expect(wd1.equals(wd3)).toBe(false);
    });

    it('should support equals with breaks', () => {
      const props = {
        open: TimeOfDay.from(9, 0),
        close: TimeOfDay.from(18, 0),
        breakStart: TimeOfDay.from(13, 0),
        breakEnd: TimeOfDay.from(14, 0),
      };
      const wd1 = WorkingDay.from(props);
      const wd2 = WorkingDay.from(props);
      const wd3 = WorkingDay.from({ ...props, breakStart: TimeOfDay.from(12, 0) });
      expect(wd1.equals(wd2)).toBe(true);
      expect(wd1.equals(wd3)).toBe(false);
    });

    it('should support equals with null vs non-null break', () => {
      const wd1 = WorkingDay.from({ open: TimeOfDay.from(9, 0), close: TimeOfDay.from(18, 0) });
      const wd2 = WorkingDay.from({
        open: TimeOfDay.from(9, 0),
        close: TimeOfDay.from(18, 0),
        breakStart: TimeOfDay.from(13, 0),
        breakEnd: TimeOfDay.from(14, 0),
      });
      expect(wd1.equals(wd2)).toBe(false);
    });
  });

  describe('ScheduleException', () => {
    it('should create a closed exception', () => {
      const ex = ScheduleException.from({ date: '2024-12-31', isClosed: true, reason: 'New Year' });
      expect(ex.date).toBe('2024-12-31');
      expect(ex.isClosed).toBe(true);
      expect(ex.customRange).toBeNull();
      expect(ex.reason).toBe('New Year');
    });

    it('should create an exception with custom range', () => {
      const range = TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(14, 0));
      const ex = ScheduleException.from({
        date: '2024-12-31',
        isClosed: false,
        customRange: range,
      });
      expect(ex.customRange).not.toBeNull();
    });

    it('should reject invalid date format', () => {
      expect(() => ScheduleException.from({ date: '31-12-2024', isClosed: true })).toThrow(
        InvalidScheduleExceptionError,
      );
    });

    it('should reject closed with customRange', () => {
      const range = TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(14, 0));
      expect(() =>
        ScheduleException.from({ date: '2024-12-31', isClosed: true, customRange: range }),
      ).toThrow(InvalidScheduleExceptionError);
    });

    it('should default reason to null', () => {
      const ex = ScheduleException.from({ date: '2024-12-31', isClosed: true });
      expect(ex.reason).toBeNull();
    });

    it('should support equals by date', () => {
      const ex1 = ScheduleException.from({ date: '2024-12-31', isClosed: true });
      const ex2 = ScheduleException.from({
        date: '2024-12-31',
        isClosed: false,
        customRange: TimeRange.from(TimeOfDay.from(10, 0), TimeOfDay.from(14, 0)),
      });
      const ex3 = ScheduleException.from({ date: '2024-01-01', isClosed: true });
      expect(ex1.equals(ex2)).toBe(true);
      expect(ex1.equals(ex3)).toBe(false);
    });
  });
});
