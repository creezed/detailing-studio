import { FromInvalidPhoneError } from './errors';

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export class PhoneNumber {
  private constructor(public readonly value: string) {}

  static from(value: string): PhoneNumber {
    if (!E164_PATTERN.test(value)) {
      throw new FromInvalidPhoneError(value);
    }

    return new PhoneNumber(value);
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
