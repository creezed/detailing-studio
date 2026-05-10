import { ValueObject } from '@det/backend-shared-ddd';

import { InvalidPhoneNumberError } from '../client/client.errors';

const RU_PHONE_PATTERN = /^\+7\d{10}$/;

export class PhoneNumber extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): PhoneNumber {
    const trimmed = value.trim();

    if (!RU_PHONE_PATTERN.test(trimmed)) {
      throw new InvalidPhoneNumberError(trimmed);
    }

    return new PhoneNumber(trimmed);
  }

  get value(): string {
    return this._value;
  }

  override equals(other: this): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }
}
