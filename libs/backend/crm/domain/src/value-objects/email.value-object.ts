import { ValueObject } from '@det/backend-shared-ddd';

import { InvalidEmailError } from '../client/client.errors';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class Email extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
  }

  static from(value: string): Email {
    const normalized = value.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalized)) {
      throw new InvalidEmailError(value);
    }

    return new Email(normalized);
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
