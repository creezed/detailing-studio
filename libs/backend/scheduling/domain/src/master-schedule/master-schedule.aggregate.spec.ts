import { DateTime } from '@det/backend-shared-ddd';

import { MasterSchedule } from './master-schedule.aggregate';
import { UnavailabilityNotFoundError, UnavailabilityOverlapsError } from './master-schedule.errors';
import {
  MasterScheduleCreated,
  MasterScheduleUpdated,
  MasterUnavailabilityAdded,
  MasterUnavailabilityRemoved,
} from './master-schedule.events';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { MasterScheduleBuilder } from '../testing/master-schedule.builder';
import { DayOfWeek } from '../value-objects/day-of-week';
import { TimeOfDay } from '../value-objects/time-of-day.value-object';
import { UnavailabilityId } from '../value-objects/unavailability-id';
import { WorkingDay } from '../value-objects/working-day.value-object';

const NOW = DateTime.from('2024-01-15T10:00:00Z');
const LATER = DateTime.from('2024-01-15T12:00:00Z');

describe('MasterSchedule aggregate', () => {
  const idGen = new FakeIdGenerator();

  describe('create', () => {
    it('should create a master schedule and emit MasterScheduleCreated', () => {
      const schedule = new MasterScheduleBuilder().withIdGen(idGen).withNow(NOW).build();

      expect(schedule.masterId).toBe('00000000-0000-4000-a000-000000000010');
      expect(schedule.branchId).toBe('00000000-0000-4000-a000-000000000099');

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(MasterScheduleCreated);

      const event = events[0] as MasterScheduleCreated;
      expect(event.masterId).toBe('00000000-0000-4000-a000-000000000010');
      expect(event.branchId).toBe('00000000-0000-4000-a000-000000000099');
    });
  });

  describe('replaceWeeklyPattern', () => {
    it('should replace pattern and emit MasterScheduleUpdated', () => {
      const schedule = new MasterScheduleBuilder().build();
      schedule.pullDomainEvents();

      const newPattern = new Map<DayOfWeek, WorkingDay | null>([
        [
          DayOfWeek.MONDAY,
          WorkingDay.from({ open: TimeOfDay.from(8, 0), close: TimeOfDay.from(20, 0) }),
        ],
        [DayOfWeek.TUESDAY, null],
      ]);

      schedule.replaceWeeklyPattern(newPattern, LATER);

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(MasterScheduleUpdated);
    });
  });

  describe('addUnavailability', () => {
    it('should add unavailability and emit MasterUnavailabilityAdded', () => {
      const schedule = new MasterScheduleBuilder().build();
      schedule.pullDomainEvents();

      const from = DateTime.from('2024-02-01T00:00:00Z');
      const to = DateTime.from('2024-02-07T00:00:00Z');
      const unavailabilityIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');

      const uid = schedule.addUnavailability(from, to, 'Vacation', unavailabilityIdGen, LATER);

      expect(uid).toBe('00000000-0000-4000-a000-aaaaaaaaaaaa');

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(MasterUnavailabilityAdded);

      const event = events[0] as MasterUnavailabilityAdded;
      expect(event.unavailabilityId).toBe(uid);
    });

    it('should throw when new unavailability overlaps existing', () => {
      const schedule = new MasterScheduleBuilder().build();
      schedule.pullDomainEvents();

      const idGen1 = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      schedule.addUnavailability(
        DateTime.from('2024-02-01T00:00:00Z'),
        DateTime.from('2024-02-07T00:00:00Z'),
        'Vacation',
        idGen1,
        LATER,
      );

      const idGen2 = new FakeIdGenerator('00000000-0000-4000-a000-bbbbbbbbbbbb');
      expect(() =>
        schedule.addUnavailability(
          DateTime.from('2024-02-05T00:00:00Z'),
          DateTime.from('2024-02-10T00:00:00Z'),
          'Sick',
          idGen2,
          LATER,
        ),
      ).toThrow(UnavailabilityOverlapsError);
    });

    it('should allow non-overlapping unavailabilities', () => {
      const schedule = new MasterScheduleBuilder().build();
      const idGen1 = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      const idGen2 = new FakeIdGenerator('00000000-0000-4000-a000-bbbbbbbbbbbb');

      schedule.addUnavailability(
        DateTime.from('2024-02-01T00:00:00Z'),
        DateTime.from('2024-02-03T00:00:00Z'),
        'Vacation',
        idGen1,
        LATER,
      );

      expect(() =>
        schedule.addUnavailability(
          DateTime.from('2024-02-03T00:00:00Z'),
          DateTime.from('2024-02-05T00:00:00Z'),
          'Training',
          idGen2,
          LATER,
        ),
      ).not.toThrow();
    });
  });

  describe('removeUnavailability', () => {
    it('should remove unavailability and emit MasterUnavailabilityRemoved', () => {
      const schedule = new MasterScheduleBuilder().build();
      const unavIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      const uid = schedule.addUnavailability(
        DateTime.from('2024-02-01T00:00:00Z'),
        DateTime.from('2024-02-07T00:00:00Z'),
        'Vacation',
        unavIdGen,
        LATER,
      );
      schedule.pullDomainEvents();

      schedule.removeUnavailability(uid, LATER);

      const events = schedule.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(MasterUnavailabilityRemoved);
      expect((events[0] as MasterUnavailabilityRemoved).unavailabilityId).toBe(uid);
    });

    it('should throw when unavailability not found', () => {
      const schedule = new MasterScheduleBuilder().build();
      const fakeId = UnavailabilityId.from('00000000-0000-4000-a000-ffffffffffff');

      expect(() => {
        schedule.removeUnavailability(fakeId, LATER);
      }).toThrow(UnavailabilityNotFoundError);
    });
  });

  describe('isAvailableAt', () => {
    it('should return true during working hours on a working day', () => {
      const schedule = new MasterScheduleBuilder().build();

      expect(
        schedule.isAvailableAt(
          DayOfWeek.MONDAY,
          TimeOfDay.from(10, 30),
          DateTime.from('2024-01-15T07:30:00Z'),
        ),
      ).toBe(true);
    });

    it('should return false during lunch break', () => {
      const schedule = new MasterScheduleBuilder().build();

      expect(
        schedule.isAvailableAt(
          DayOfWeek.MONDAY,
          TimeOfDay.from(13, 30),
          DateTime.from('2024-01-15T10:30:00Z'),
        ),
      ).toBe(false);
    });

    it('should return false on a day off (null pattern)', () => {
      const schedule = new MasterScheduleBuilder().build();

      expect(
        schedule.isAvailableAt(
          DayOfWeek.SATURDAY,
          TimeOfDay.from(10, 0),
          DateTime.from('2024-01-20T07:00:00Z'),
        ),
      ).toBe(false);
    });

    it('should return false outside working hours', () => {
      const schedule = new MasterScheduleBuilder().build();

      expect(
        schedule.isAvailableAt(
          DayOfWeek.MONDAY,
          TimeOfDay.from(8, 0),
          DateTime.from('2024-01-15T05:00:00Z'),
        ),
      ).toBe(false);
    });

    it('should return false when within an unavailability period', () => {
      const schedule = new MasterScheduleBuilder().build();
      const unavIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      schedule.addUnavailability(
        DateTime.from('2024-01-15T00:00:00Z'),
        DateTime.from('2024-01-16T00:00:00Z'),
        'Sick day',
        unavIdGen,
        LATER,
      );

      expect(
        schedule.isAvailableAt(
          DayOfWeek.MONDAY,
          TimeOfDay.from(10, 0),
          DateTime.from('2024-01-15T07:00:00Z'),
        ),
      ).toBe(false);
    });

    it('should return true after unavailability is removed', () => {
      const schedule = new MasterScheduleBuilder().build();
      const unavIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      const uid = schedule.addUnavailability(
        DateTime.from('2024-01-15T00:00:00Z'),
        DateTime.from('2024-01-16T00:00:00Z'),
        'Sick day',
        unavIdGen,
        LATER,
      );

      schedule.removeUnavailability(uid, LATER);

      expect(
        schedule.isAvailableAt(
          DayOfWeek.MONDAY,
          TimeOfDay.from(10, 0),
          DateTime.from('2024-01-15T07:00:00Z'),
        ),
      ).toBe(true);
    });
  });

  describe('workingRangesOnDay', () => {
    it('should return full ranges when no unavailabilities', () => {
      const schedule = new MasterScheduleBuilder().build();
      const dayStart = DateTime.from('2024-01-15T00:00:00Z');
      const dayEnd = DateTime.from('2024-01-16T00:00:00Z');

      const ranges = schedule.workingRangesOnDay(DayOfWeek.MONDAY, dayStart, dayEnd);

      expect(ranges).toHaveLength(2);
      expect(ranges[0]?.start.equals(TimeOfDay.from(9, 0))).toBe(true);
      expect(ranges[0]?.end.equals(TimeOfDay.from(13, 0))).toBe(true);
      expect(ranges[1]?.start.equals(TimeOfDay.from(14, 0))).toBe(true);
      expect(ranges[1]?.end.equals(TimeOfDay.from(18, 0))).toBe(true);
    });

    it('should return empty array on a day off', () => {
      const schedule = new MasterScheduleBuilder().build();
      const dayStart = DateTime.from('2024-01-20T00:00:00Z');
      const dayEnd = DateTime.from('2024-01-21T00:00:00Z');

      expect(schedule.workingRangesOnDay(DayOfWeek.SATURDAY, dayStart, dayEnd)).toEqual([]);
    });

    it('should split range around unavailability in the middle', () => {
      const pattern = new Map<DayOfWeek, WorkingDay | null>([
        [
          DayOfWeek.MONDAY,
          WorkingDay.from({ open: TimeOfDay.from(9, 0), close: TimeOfDay.from(18, 0) }),
        ],
      ]);
      const schedule = new MasterScheduleBuilder().withWeeklyPattern(pattern).build();

      const unavIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      schedule.addUnavailability(
        DateTime.from('2024-01-15T10:00:00Z'),
        DateTime.from('2024-01-15T12:00:00Z'),
        'Doctor',
        unavIdGen,
        LATER,
      );

      const dayStart = DateTime.from('2024-01-15T00:00:00Z');
      const dayEnd = DateTime.from('2024-01-16T00:00:00Z');

      const ranges = schedule.workingRangesOnDay(DayOfWeek.MONDAY, dayStart, dayEnd);

      expect(ranges).toHaveLength(2);
      expect(ranges[0]?.start.equals(TimeOfDay.from(9, 0))).toBe(true);
      expect(ranges[0]?.end.equals(TimeOfDay.from(10, 0))).toBe(true);
      expect(ranges[1]?.start.equals(TimeOfDay.from(12, 0))).toBe(true);
      expect(ranges[1]?.end.equals(TimeOfDay.from(18, 0))).toBe(true);
    });

    it('should handle full-day unavailability', () => {
      const schedule = new MasterScheduleBuilder().build();

      const unavIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      schedule.addUnavailability(
        DateTime.from('2024-01-15T00:00:00Z'),
        DateTime.from('2024-01-16T00:00:00Z'),
        'Sick',
        unavIdGen,
        LATER,
      );

      const dayStart = DateTime.from('2024-01-15T00:00:00Z');
      const dayEnd = DateTime.from('2024-01-16T00:00:00Z');

      const ranges = schedule.workingRangesOnDay(DayOfWeek.MONDAY, dayStart, dayEnd);
      expect(ranges).toEqual([]);
    });

    it('should ignore non-overlapping unavailabilities', () => {
      const schedule = new MasterScheduleBuilder().build();

      const unavIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      schedule.addUnavailability(
        DateTime.from('2024-01-16T00:00:00Z'),
        DateTime.from('2024-01-17T00:00:00Z'),
        'Tomorrow',
        unavIdGen,
        LATER,
      );

      const dayStart = DateTime.from('2024-01-15T00:00:00Z');
      const dayEnd = DateTime.from('2024-01-16T00:00:00Z');

      const ranges = schedule.workingRangesOnDay(DayOfWeek.MONDAY, dayStart, dayEnd);
      expect(ranges).toHaveLength(2);
    });
  });

  describe('restore', () => {
    it('should restore from snapshot without events', () => {
      const original = new MasterScheduleBuilder().build();
      const unavIdGen = new FakeIdGenerator('00000000-0000-4000-a000-aaaaaaaaaaaa');
      original.addUnavailability(
        DateTime.from('2024-02-01T00:00:00Z'),
        DateTime.from('2024-02-07T00:00:00Z'),
        'Vacation',
        unavIdGen,
        LATER,
      );
      const snapshot = original.toSnapshot();

      const restored = MasterSchedule.restore(snapshot);

      expect(restored.id).toBe(original.id);
      expect(restored.masterId).toBe(original.masterId);
      expect(restored.branchId).toBe(original.branchId);
      expect(restored.pullDomainEvents()).toHaveLength(0);
    });
  });
});
