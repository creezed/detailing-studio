import { DateTime } from './date-time.value-object';
import { InvalidDateTimeError } from './errors';

describe('DateTime', () => {
  it('creates immutable DateTime from ISO string', () => {
    const dateTime = DateTime.from('2026-05-04T12:00:00.000Z');
    const date = dateTime.toDate();

    date.setUTCFullYear(2030);

    expect(dateTime.iso()).toBe('2026-05-04T12:00:00.000Z');
  });

  it('copies another DateTime value', () => {
    const first = DateTime.from('2026-05-04T12:00:00.000Z');
    const second = DateTime.from(first);

    expect(second.equals(first)).toBe(true);
    expect(second).not.toBe(first);
  });

  it('creates current DateTime', () => {
    const before = Date.now();
    const now = DateTime.now().toDate().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });

  it('throws for invalid date value', () => {
    expect(() => DateTime.from('not-a-date')).toThrow(InvalidDateTimeError);
  });

  it('plusDays adds days', () => {
    const dt = DateTime.from('2026-01-30T00:00:00.000Z');

    expect(dt.plusDays(1).iso()).toBe('2026-01-31T00:00:00.000Z');
    expect(dt.plusDays(3).iso()).toBe('2026-02-02T00:00:00.000Z');
  });

  it('plusMonths adds months and clamps overflow', () => {
    const jan31 = DateTime.from('2026-01-31T00:00:00.000Z');

    expect(jan31.plusMonths(1).iso()).toBe('2026-02-28T00:00:00.000Z');
    expect(jan31.plusMonths(3).iso()).toBe('2026-04-30T00:00:00.000Z');
    expect(jan31.plusMonths(12).iso()).toBe('2027-01-31T00:00:00.000Z');
  });

  it('isBefore / isAfter compare correctly', () => {
    const earlier = DateTime.from('2026-01-01T00:00:00.000Z');
    const later = DateTime.from('2026-06-01T00:00:00.000Z');

    expect(earlier.isBefore(later)).toBe(true);
    expect(later.isBefore(earlier)).toBe(false);
    expect(later.isAfter(earlier)).toBe(true);
    expect(earlier.isAfter(later)).toBe(false);
    expect(earlier.isBefore(earlier)).toBe(false);
  });

  it('getTime returns epoch millis', () => {
    const dt = DateTime.from('2026-01-01T00:00:00.000Z');

    expect(dt.getTime()).toBe(new Date('2026-01-01T00:00:00.000Z').getTime());
  });
});
