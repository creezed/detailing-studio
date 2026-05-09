import { ValueObject } from '@det/backend-shared-ddd';

import { InvalidEmailError } from '../user/user.errors';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class Email extends ValueObject {
  private constructor(private readonly value: string) {
    super();
  }

  static from(value: string): Email {
    const normalizedValue = value.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedValue)) {
      throw new InvalidEmailError(value);
    }

    return new Email(normalizedValue);
  }

  getValue(): string {
    return this.value;
  }

  override equals(other: this): boolean {
    return this.value === other.value;
  }

  override toString(): string {
    return this.value;
  }
}
