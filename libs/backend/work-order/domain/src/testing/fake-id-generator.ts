import type { IIdGenerator } from '@det/backend-shared-ddd';

export class FakeIdGenerator implements IIdGenerator {
  private _counter = 0;
  private readonly _prefix: string;

  constructor(prefix = '00000000-0000-4000-a000-') {
    this._prefix = prefix;
  }

  generate(): string {
    this._counter++;
    return `${this._prefix}${String(this._counter).padStart(12, '0')}`;
  }

  reset(): void {
    this._counter = 0;
  }
}
