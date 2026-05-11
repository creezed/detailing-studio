import { DateTime } from '@det/backend-shared-ddd';

import { FakeIdGenerator } from './fake-id-generator';
import { Bay } from '../bay/bay.aggregate';

import type { CreateBayProps } from '../bay/bay.aggregate';

const DEFAULTS: CreateBayProps = {
  branchId: '00000000-0000-4000-a000-000000000099',
  name: 'Bay 1',
  idGen: new FakeIdGenerator(),
  now: DateTime.from('2024-01-15T10:00:00Z'),
};

export class BayBuilder {
  private _props: CreateBayProps = { ...DEFAULTS };

  withBranchId(branchId: string): this {
    this._props = { ...this._props, branchId };
    return this;
  }

  withName(name: string): this {
    this._props = { ...this._props, name };
    return this;
  }

  withIdGen(idGen: FakeIdGenerator): this {
    this._props = { ...this._props, idGen };
    return this;
  }

  withNow(now: DateTime): this {
    this._props = { ...this._props, now };
    return this;
  }

  build(): Bay {
    return Bay.create(this._props);
  }
}
