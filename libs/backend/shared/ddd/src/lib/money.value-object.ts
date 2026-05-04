import { InvalidMoneyAmountError, NotEnoughFundsError } from './errors';
import { ValueObject } from './value-object';

export type Currency = 'RUB';

export class Money extends ValueObject {
  private constructor(
    public readonly cents: bigint,
    public readonly currency: Currency,
  ) {
    super();
  }

  static rub(amount: number | string | bigint): Money {
    const cents = Money.toCents(amount);

    if (cents < 0n) {
      throw new InvalidMoneyAmountError(amount);
    }

    return new Money(cents, 'RUB');
  }

  override equals(other: this): boolean {
    return this.cents === other.cents;
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    const result = this.cents - other.cents;

    if (result < 0n) {
      throw new NotEnoughFundsError();
    }

    return new Money(result, this.currency);
  }

  toNumber(): number {
    return Number(this.cents) / 100;
  }

  private static toCents(amount: number | string | bigint): bigint {
    if (typeof amount === 'bigint') {
      return amount * 100n;
    }

    const normalized = typeof amount === 'number' ? amount.toString() : amount.trim();

    if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
      throw new InvalidMoneyAmountError(amount);
    }

    const sign = normalized.startsWith('-') ? -1n : 1n;
    const unsigned = normalized.replace('-', '');
    const [rublesPart = '0', centsPart = ''] = unsigned.split('.');
    const rubles = BigInt(rublesPart);
    const cents = BigInt(centsPart.padEnd(2, '0'));

    return sign * (rubles * 100n + cents);
  }
}
