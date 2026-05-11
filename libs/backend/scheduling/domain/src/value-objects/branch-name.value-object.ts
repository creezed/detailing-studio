import { DomainError } from '@det/backend-shared-ddd';

export class InvalidBranchNameError extends DomainError {
  readonly code = 'INVALID_BRANCH_NAME';
  readonly httpStatus = 422;

  constructor(public readonly value: string) {
    super(`Branch name must be 1..120 characters, got ${String(value.length)}`);
  }
}

export class BranchName {
  private constructor(private readonly _value: string) {}

  static from(value: string): BranchName {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      throw new InvalidBranchNameError(trimmed);
    }
    return new BranchName(trimmed);
  }

  getValue(): string {
    return this._value;
  }

  equals(other: BranchName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
