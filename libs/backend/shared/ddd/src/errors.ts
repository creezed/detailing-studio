import { DomainError } from './domain-error';

export class NotEnoughFundsError extends DomainError {
  readonly code = 'NOT_ENOUGH_FUNDS';
  readonly httpStatus = 422;

  constructor() {
    super('Not enough funds');
  }
}

export class InvalidMoneyAmountError extends DomainError {
  readonly code = 'INVALID_MONEY_AMOUNT';
  readonly httpStatus = 422;

  constructor(amount: number | string | bigint) {
    super(`Invalid money amount: ${amount.toString()}`);
  }
}

export class InvalidDateTimeError extends DomainError {
  readonly code = 'INVALID_DATE_TIME';
  readonly httpStatus = 422;

  constructor(value: string | number | Date) {
    super(`Invalid DateTime: ${String(value)}`);
  }
}

export class InvalidQuantityError extends DomainError {
  readonly code = 'INVALID_QUANTITY';
  readonly httpStatus = 422;

  constructor(amount: number) {
    super(`Invalid quantity amount: ${amount.toString()}`);
  }
}

export class QuantityUnitMismatchError extends DomainError {
  readonly code = 'QUANTITY_UNIT_MISMATCH';
  readonly httpStatus = 422;

  constructor() {
    super('Quantity units must match');
  }
}

export class FromInvalidPhoneError extends DomainError {
  readonly code = 'INVALID_PHONE_NUMBER';
  readonly httpStatus = 422;

  constructor(value: string) {
    super(`Invalid E.164 phone number: ${value}`);
  }
}
