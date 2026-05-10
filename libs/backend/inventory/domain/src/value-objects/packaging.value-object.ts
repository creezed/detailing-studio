import { DomainError, ValueObject } from '@det/backend-shared-ddd';

export class InvalidPackagingError extends DomainError {
  readonly code = 'INVALID_PACKAGING';
  readonly httpStatus = 422;

  constructor(public readonly reason: string) {
    super(`Invalid packaging: ${reason}`);
  }
}

export class Packaging extends ValueObject {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly coefficient: number,
  ) {
    super();
  }

  static create(id: string, name: string, coefficient: number): Packaging {
    if (!id.trim()) {
      throw new InvalidPackagingError('id must not be empty');
    }

    if (!name.trim()) {
      throw new InvalidPackagingError('name must not be empty');
    }

    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      throw new InvalidPackagingError(`coefficient must be > 0, got ${String(coefficient)}`);
    }

    return new Packaging(id.trim(), name.trim(), coefficient);
  }

  override equals(other: this): boolean {
    return (
      this.id === other.id && this.name === other.name && this.coefficient === other.coefficient
    );
  }
}
