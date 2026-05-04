export class NotEnoughFundsError extends Error {
  constructor() {
    super('Not enough funds');
    this.name = 'NotEnoughFundsError';
  }
}

export class InvalidMoneyAmountError extends Error {
  constructor(amount: number | string | bigint) {
    super(`Invalid money amount: ${amount.toString()}`);
    this.name = 'InvalidMoneyAmountError';
  }
}

export class InvalidDateTimeError extends Error {
  constructor(value: string | number | Date) {
    super(`Invalid DateTime: ${String(value)}`);
    this.name = 'InvalidDateTimeError';
  }
}

export class InvalidQuantityError extends Error {
  constructor(amount: number) {
    super(`Invalid quantity amount: ${amount.toString()}`);
    this.name = 'InvalidQuantityError';
  }
}

export class QuantityUnitMismatchError extends Error {
  constructor() {
    super('Quantity units must match');
    this.name = 'QuantityUnitMismatchError';
  }
}

export class FromInvalidPhoneError extends Error {
  constructor(value: string) {
    super(`Invalid E.164 phone number: ${value}`);
    this.name = 'FromInvalidPhoneError';
  }
}
