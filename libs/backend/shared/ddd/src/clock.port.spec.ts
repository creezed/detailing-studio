import { CLOCK } from './clock.port';
import { DateTime } from './date-time.value-object';

import type { IClock } from './clock.port';

class FixedClock implements IClock {
  constructor(private readonly fixedNow: DateTime) {}

  now(): DateTime {
    return this.fixedNow;
  }
}

describe('IClock', () => {
  it('provides current DateTime through a port', () => {
    const fixedNow = DateTime.from('2026-05-04T12:00:00.000Z');
    const clock: IClock = new FixedClock(fixedNow);

    expect(CLOCK.description).toBe('CLOCK');
    expect(clock.now().equals(fixedNow)).toBe(true);
  });
});
