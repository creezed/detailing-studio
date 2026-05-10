import type { IIdGenerator } from '@det/backend-shared-ddd';

export class FixedIdGenerator implements IIdGenerator {
  private _currentIndex = 0;

  constructor(private readonly _values: readonly string[]) {}

  generate(): string {
    const value = this._values[this._currentIndex];

    if (value === undefined) {
      throw new Error('No more IDs configured for FixedIdGenerator');
    }

    this._currentIndex += 1;

    return value;
  }
}
