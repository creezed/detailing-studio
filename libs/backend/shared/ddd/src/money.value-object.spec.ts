import { InvalidMoneyAmountError, NotEnoughFundsError } from './errors';
import { Money } from './money.value-object';

describe('Money', () => {
  it('creates RUB money from ruble amount', () => {
    const money = Money.rub('10.50');

    expect(money.cents).toBe(1050n);
    expect(money.currency).toBe('RUB');
    expect(money.toNumber()).toBe(10.5);
  });

  it('creates RUB money from bigint ruble amount', () => {
    expect(Money.rub(2n).cents).toBe(200n);
  });

  it('compares by cents', () => {
    expect(Money.rub(10).equals(Money.rub('10.00'))).toBe(true);
    expect(Money.rub(10).equals(Money.rub('10.01'))).toBe(false);
  });

  it('adds money', () => {
    expect(Money.rub(10).add(Money.rub('2.50')).toNumber()).toBe(12.5);
  });

  it('subtracts money when result is non-negative', () => {
    expect(Money.rub(10).subtract(Money.rub('2.50')).toNumber()).toBe(7.5);
  });

  it('throws when subtraction result is negative', () => {
    expect(() => Money.rub(1).subtract(Money.rub(2))).toThrow(NotEnoughFundsError);
  });

  it('throws for invalid amount', () => {
    expect(() => Money.rub('1.234')).toThrow(InvalidMoneyAmountError);
    expect(() => Money.rub('-1')).toThrow(InvalidMoneyAmountError);
  });
});
