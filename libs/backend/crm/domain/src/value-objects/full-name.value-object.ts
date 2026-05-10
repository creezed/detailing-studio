import { ValueObject } from '@det/backend-shared-ddd';

import { InvalidFullNameError } from '../client/client.errors';

export class FullName extends ValueObject {
  private constructor(
    public readonly last: string,
    public readonly first: string,
    public readonly middle: string | null,
  ) {
    super();
  }

  static create(last: string, first: string, middle?: string | null): FullName {
    const trimmedLast = last.trim();
    const trimmedFirst = first.trim();

    if (trimmedLast.length === 0 || trimmedFirst.length === 0) {
      throw new InvalidFullNameError(last, first);
    }

    return new FullName(trimmedLast, trimmedFirst, middle?.trim() || null);
  }

  static anonymized(shortId: string): FullName {
    return new FullName(`ANONYMIZED_${shortId}`, `ANONYMIZED_${shortId}`, null);
  }

  format(): string {
    const parts = [this.last, this.first];

    if (this.middle !== null) {
      parts.push(this.middle);
    }

    return parts.join(' ');
  }

  override equals(other: this): boolean {
    return this.last === other.last && this.first === other.first && this.middle === other.middle;
  }
}
