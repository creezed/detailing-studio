import type { IIdGenerator } from '@det/backend-shared-ddd';

export class FakeIdGenerator implements IIdGenerator {
  private _nextId: string;

  constructor(nextId = '00000000-0000-4000-a000-000000000001') {
    this._nextId = nextId;
  }

  generate(): string {
    return this._nextId;
  }

  setNext(id: string): void {
    this._nextId = id;
  }
}
