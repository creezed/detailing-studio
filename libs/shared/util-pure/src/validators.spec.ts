import { Money } from './money.value-object';
import { formatRubAmount, isUUID, parseDate } from './validators';

describe('validators', () => {
  it('checks UUID values', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUUID('not-a-uuid')).toBe(false);
  });

  it('parses date values to DateTime', () => {
    expect(parseDate('2026-05-04T12:00:00.000Z').iso()).toBe('2026-05-04T12:00:00.000Z');
  });

  it('formats RUB amounts', () => {
    expect(formatRubAmount(Money.rub('1234.50'))).toContain('1 234,50');
  });
});
