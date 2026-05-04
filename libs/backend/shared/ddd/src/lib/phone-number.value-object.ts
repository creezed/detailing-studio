import { FromInvalidPhoneError } from './errors';
import { ValueObject } from './value-object';

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export class PhoneNumber extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static from(value: string): PhoneNumber {
    if (!E164_PATTERN.test(value)) {
      throw new FromInvalidPhoneError(value);
    }

    return new PhoneNumber(value);
  }

  override equals(other: this): boolean {
    return this.value === other.value;
  }

  override toString(): string {
    return this.value;
  }
}
