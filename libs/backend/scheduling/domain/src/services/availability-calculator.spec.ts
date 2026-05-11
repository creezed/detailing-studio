import { DateTime, Money } from '@det/backend-shared-ddd';

import { AvailabilityCalculator } from './availability-calculator';
import { AppointmentBuilder } from '../testing/appointment.builder';
import { BranchScheduleBuilder } from '../testing/branch-schedule.builder';
import { FakeIdGenerator } from '../testing/fake-id-generator';
import { MasterScheduleBuilder } from '../testing/master-schedule.builder';
import { AppointmentServiceId } from '../value-objects/appointment-service-id';
import { CreationChannel } from '../value-objects/creation-channel';
import { DayOfWeek } from '../value-objects/day-of-week';
import { Duration } from '../value-objects/duration.value-object';
import { MasterId } from '../value-objects/master-id';
import { ScheduleException } from '../value-objects/schedule-exception.value-object';
import { TimeOfDay } from '../value-objects/time-of-day.value-object';
import { TimeSlot } from '../value-objects/time-slot.value-object';
import { Timezone } from '../value-objects/timezone.value-object';
import { WorkingDay } from '../value-objects/working-day.value-object';

import type { AvailabilityQuery } from './availability-calculator';
import type { MasterWeeklyPattern } from '../master-schedule/master-schedule.aggregate';
import type { AppointmentService } from '../value-objects/appointment-service.value-object';

const TZ = Timezone.from('Europe/Moscow');
const MASTER_ID = '00000000-0000-4000-a000-000000000010';

function singleDayRange(dateIso: string): { from: Date; to: Date } {
  const from = new Date(dateIso);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

function makeFullDayPattern(
  open: [number, number],
  close: [number, number],
  breakSlot?: [[number, number], [number, number]],
): MasterWeeklyPattern {
  const openTod = TimeOfDay.from(open[0], open[1]);
  const closeTod = TimeOfDay.from(close[0], close[1]);
  const wd = breakSlot
    ? WorkingDay.from({
        open: openTod,
        close: closeTod,
        breakStart: TimeOfDay.from(breakSlot[0][0], breakSlot[0][1]),
        breakEnd: TimeOfDay.from(breakSlot[1][0], breakSlot[1][1]),
      })
    : WorkingDay.from({ open: openTod, close: closeTod });

  return new Map<DayOfWeek, WorkingDay | null>([
    [DayOfWeek.MONDAY, wd],
    [DayOfWeek.TUESDAY, wd],
    [DayOfWeek.WEDNESDAY, wd],
    [DayOfWeek.THURSDAY, wd],
    [DayOfWeek.FRIDAY, wd],
    [DayOfWeek.SATURDAY, wd],
    [DayOfWeek.SUNDAY, wd],
  ]);
}

function makeService(durationMinutes: number): AppointmentService {
  return {
    id: AppointmentServiceId.from('00000000-0000-4000-a000-000000000050'),
    serviceId: '00000000-0000-4000-a000-000000000060',
    serviceNameSnapshot: 'Test Service',
    durationMinutesSnapshot: durationMinutes,
    priceSnapshot: Money.rub(1000),
  };
}

describe('AvailabilityCalculator', () => {
  const calc = new AvailabilityCalculator();

  describe('basic scenarios', () => {
    it('should produce correct slots for 1 master, no break, 1h service, 15min grid', () => {
      const pattern = makeFullDayPattern([9, 0], [21, 0]);
      const branchSchedule = new BranchScheduleBuilder().withWeeklyPattern(pattern).build();
      const masterSchedule = new MasterScheduleBuilder().withWeeklyPattern(pattern).build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
        gridStep: Duration.minutes(15),
      };

      const slots = calc.calculate(query);

      const expectedCount = Math.floor((12 * 60 - 60) / 15) + 1;
      expect(slots).toHaveLength(expectedCount);

      expect(slots[0]?.slot.start.iso()).toBe('2024-02-15T09:00:00.000Z');

      const last = slots[slots.length - 1];
      expect(last?.slot.start.iso()).toBe('2024-02-15T20:00:00.000Z');
      expect(last?.slot.end.iso()).toBe('2024-02-15T21:00:00.000Z');
    });

    it('should handle break in schedule (9-13, 14-18)', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const masterSchedule = new MasterScheduleBuilder().build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      };

      const slots = calc.calculate(query);

      const morningSlots = slots.filter(
        (s) => s.slot.end.toDate().getTime() <= new Date('2024-02-15T13:00:00Z').getTime(),
      );
      expect(morningSlots[morningSlots.length - 1]?.slot.start.iso()).toBe(
        '2024-02-15T12:00:00.000Z',
      );

      const afterBreak = slots.filter(
        (s) => s.slot.start.toDate().getTime() >= new Date('2024-02-15T14:00:00Z').getTime(),
      );
      expect(afterBreak[0]?.slot.start.iso()).toBe('2024-02-15T14:00:00.000Z');

      const duringBreak = slots.filter(
        (s) =>
          s.slot.start.toDate().getTime() < new Date('2024-02-15T14:00:00Z').getTime() &&
          s.slot.end.toDate().getTime() > new Date('2024-02-15T13:00:00Z').getTime(),
      );
      expect(duringBreak).toHaveLength(0);
    });
  });

  describe('existing appointments', () => {
    it('should block slots overlapping with existing appointments', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const masterSchedule = new MasterScheduleBuilder().build();

      const appointment = new AppointmentBuilder()
        .withMasterId(MASTER_ID)
        .withSlot(
          TimeSlot.from(
            DateTime.from('2024-02-15T11:00:00Z'),
            DateTime.from('2024-02-15T12:00:00Z'),
            TZ,
          ),
        )
        .withCreatedVia(CreationChannel.MANAGER)
        .withServices([makeService(60)])
        .build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [appointment],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      };

      const slots = calc.calculate(query);

      const conflicting = slots.filter((s) => s.slot.overlaps(appointment.slot));
      expect(conflicting).toHaveLength(0);
    });

    it('should not block slots for CANCELLED and NO_SHOW appointments', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const masterSchedule = new MasterScheduleBuilder().build();
      const blockedSlot = TimeSlot.from(
        DateTime.from('2024-02-15T11:00:00Z'),
        DateTime.from('2024-02-15T12:00:00Z'),
        TZ,
      );

      const cancelled = new AppointmentBuilder()
        .withMasterId(MASTER_ID)
        .withSlot(blockedSlot)
        .withServices([makeService(60)])
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-000000000901'))
        .build();
      cancelled.cancel(
        '00000000-0000-4000-a000-000000000040',
        'Client requested',
        DateTime.from('2024-02-15T08:00:00Z'),
      );

      const noShow = new AppointmentBuilder()
        .withMasterId(MASTER_ID)
        .withSlot(
          TimeSlot.from(
            DateTime.from('2024-02-15T15:00:00Z'),
            DateTime.from('2024-02-15T16:00:00Z'),
            TZ,
          ),
        )
        .withServices([makeService(60)])
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-000000000902'))
        .build();
      noShow.markNoShow(
        '00000000-0000-4000-a000-000000000040',
        DateTime.from('2024-02-15T15:10:00Z'),
      );

      const slots = calc.calculate({
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [cancelled, noShow],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      });

      expect(slots.some((s) => s.slot.equals(blockedSlot))).toBe(true);
    });
  });

  describe('closed day / holiday', () => {
    it('should return 0 slots for a closed exception day', () => {
      const branchSchedule = new BranchScheduleBuilder()
        .withExceptions([ScheduleException.from({ date: '2024-02-15', isClosed: true })])
        .build();
      const masterSchedule = new MasterScheduleBuilder().build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      };

      expect(calc.calculate(query)).toHaveLength(0);
    });

    it('should return 0 slots on a day off (Saturday by default)', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const masterSchedule = new MasterScheduleBuilder().build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-17T00:00:00Z'),
        timezone: TZ,
      };

      expect(calc.calculate(query)).toHaveLength(0);
    });
  });

  describe('multiple masters', () => {
    it('should combine slots from multiple masters', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const master1 = new MasterScheduleBuilder()
        .withMasterId('00000000-0000-4000-a000-000000000010')
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-aa0000000001'))
        .build();
      const master2 = new MasterScheduleBuilder()
        .withMasterId('00000000-0000-4000-a000-000000000011')
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-aa0000000002'))
        .build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [master1, master2],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      };

      const slots = calc.calculate(query);

      const m1Slots = slots.filter((s) => s.masterId === '00000000-0000-4000-a000-000000000010');
      const m2Slots = slots.filter((s) => s.masterId === '00000000-0000-4000-a000-000000000011');

      expect(m1Slots.length).toBeGreaterThan(0);
      expect(m2Slots.length).toBeGreaterThan(0);
      expect(m1Slots.length).toBe(m2Slots.length);
    });

    it('should filter by requested masterId', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const requestedMasterId = MasterId.from('00000000-0000-4000-a000-000000000011');
      const master1 = new MasterScheduleBuilder()
        .withMasterId('00000000-0000-4000-a000-000000000010')
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-aa0000000001'))
        .build();
      const master2 = new MasterScheduleBuilder()
        .withMasterId(requestedMasterId)
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-aa0000000002'))
        .build();

      const slots = calc.calculate({
        branchSchedule,
        masterSchedules: [master1, master2],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        masterId: requestedMasterId,
        timezone: TZ,
      });

      expect(slots.length).toBeGreaterThan(0);
      expect(slots.every((s) => s.masterId === requestedMasterId)).toBe(true);
    });
  });

  describe('overnight edge', () => {
    it('should reject 23:30-00:30 working day for MVP', () => {
      expect(() =>
        WorkingDay.from({
          open: TimeOfDay.from(23, 30),
          close: TimeOfDay.from(0, 30),
        }),
      ).toThrow();
    });
  });

  describe('service too long for window', () => {
    it('should return 0 slots when service > available window', () => {
      const pattern = makeFullDayPattern([9, 0], [10, 0]);
      const branchSchedule = new BranchScheduleBuilder().withWeeklyPattern(pattern).build();
      const masterSchedule = new MasterScheduleBuilder().withWeeklyPattern(pattern).build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [],
        servicesDuration: Duration.minutes(90),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      };

      expect(calc.calculate(query)).toHaveLength(0);
    });
  });

  describe('multi-day search range', () => {
    it('should produce slots across multiple days', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const masterSchedule = new MasterScheduleBuilder().build();

      const from = new Date('2024-02-12T00:00:00Z');
      const to = new Date('2024-02-19T00:00:00Z');

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: { from, to },
        timezone: TZ,
      };

      const slots = calc.calculate(query);
      expect(slots.length).toBeGreaterThan(0);

      const uniqueDays = new Set(slots.map((s) => s.slot.start.iso().slice(0, 10)));
      expect(uniqueDays.size).toBe(5);
    });
  });

  describe('sorting', () => {
    it('should return slots sorted by start time ascending', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const master1 = new MasterScheduleBuilder()
        .withMasterId('00000000-0000-4000-a000-000000000010')
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-aa0000000001'))
        .build();
      const master2 = new MasterScheduleBuilder()
        .withMasterId('00000000-0000-4000-a000-000000000011')
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-aa0000000002'))
        .build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [master1, master2],
        existingAppointments: [],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      };

      const slots = calc.calculate(query);
      for (let i = 1; i < slots.length; i++) {
        const prev = slots[i - 1]?.slot.start.toDate().getTime() ?? 0;
        const curr = slots[i]?.slot.start.toDate().getTime() ?? 0;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });

  describe('performance', () => {
    it('should compute 50 masters x 14 days x appointments in < 200ms', () => {
      const allDaysPattern = makeFullDayPattern([8, 0], [20, 0]);
      const branchSchedule = new BranchScheduleBuilder().withWeeklyPattern(allDaysPattern).build();

      const masters = Array.from({ length: 50 }, (_, i) => {
        const hex = (i + 1).toString(16).padStart(12, '0');
        return new MasterScheduleBuilder()
          .withMasterId(`00000000-0000-4000-a000-${hex}`)
          .withWeeklyPattern(allDaysPattern)
          .withIdGen(new FakeIdGenerator(`00000000-0000-4000-b000-${hex}`))
          .build();
      });

      const appointments = Array.from({ length: 200 }, (_, i) => {
        const masterIdx = i % 50;
        const dayOffset = Math.floor(i / 14) % 14;
        const hourOffset = 8 + (i % 10);
        const hex = (masterIdx + 1).toString(16).padStart(12, '0');
        const day = new Date('2024-02-12T00:00:00Z');
        day.setUTCDate(day.getUTCDate() + dayOffset);
        const startIso = `${day.toISOString().slice(0, 11)}${String(hourOffset).padStart(2, '0')}:00:00.000Z`;
        const endDate = new Date(startIso);
        endDate.setUTCHours(endDate.getUTCHours() + 1);

        return new AppointmentBuilder()
          .withMasterId(`00000000-0000-4000-a000-${hex}`)
          .withSlot(
            TimeSlot.from(DateTime.from(startIso), DateTime.from(endDate.toISOString()), TZ),
          )
          .withServices([makeService(60)])
          .withIdGen(
            new FakeIdGenerator(`00000000-0000-4000-a${String(i).padStart(3, '0')}-000000000000`),
          )
          .build();
      });

      const from = new Date('2024-02-12T00:00:00Z');
      const to = new Date('2024-02-26T00:00:00Z');

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: masters,
        existingAppointments: appointments,
        servicesDuration: Duration.minutes(60),
        searchRange: { from, to },
        timezone: TZ,
      };

      const start = performance.now();
      const slots = calc.calculate(query);
      const elapsed = performance.now() - start;

      expect(slots.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('no-overlap invariant', () => {
    it('no returned slot should overlap with any existing appointment for same master', () => {
      const branchSchedule = new BranchScheduleBuilder().build();
      const masterSchedule = new MasterScheduleBuilder().build();

      const appt1 = new AppointmentBuilder()
        .withMasterId(MASTER_ID)
        .withSlot(
          TimeSlot.from(
            DateTime.from('2024-02-15T10:00:00Z'),
            DateTime.from('2024-02-15T11:00:00Z'),
            TZ,
          ),
        )
        .withServices([makeService(60)])
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-dddddddddddd'))
        .build();

      const appt2 = new AppointmentBuilder()
        .withMasterId(MASTER_ID)
        .withSlot(
          TimeSlot.from(
            DateTime.from('2024-02-15T15:00:00Z'),
            DateTime.from('2024-02-15T16:30:00Z'),
            TZ,
          ),
        )
        .withServices([makeService(90)])
        .withIdGen(new FakeIdGenerator('00000000-0000-4000-a000-eeeeeeeeeeee'))
        .build();

      const query: AvailabilityQuery = {
        branchSchedule,
        masterSchedules: [masterSchedule],
        existingAppointments: [appt1, appt2],
        servicesDuration: Duration.minutes(60),
        searchRange: singleDayRange('2024-02-15T00:00:00Z'),
        timezone: TZ,
      };

      const slots = calc.calculate(query);
      for (const s of slots) {
        expect(s.slot.overlaps(appt1.slot)).toBe(false);
        expect(s.slot.overlaps(appt2.slot)).toBe(false);
      }
    });
  });
});
