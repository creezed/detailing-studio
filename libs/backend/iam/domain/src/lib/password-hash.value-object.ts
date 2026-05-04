import { ValueObject } from '@det/backend/shared/ddd';

export class PasswordHash extends ValueObject {
  private constructor(private readonly value: string) {
    super();
  }

  static fromHash(value: string): PasswordHash {
    return new PasswordHash(value);
  }

  getValue(): string {
    return this.value;
  }

  override equals(other: this): boolean {
    return this.value === other.value;
  }
}
