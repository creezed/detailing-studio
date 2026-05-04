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
});
