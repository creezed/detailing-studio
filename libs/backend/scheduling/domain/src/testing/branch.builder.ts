import { DateTime } from '@det/backend-shared-ddd';

import { FakeIdGenerator } from './fake-id-generator';
import { Branch } from '../branch/branch.aggregate';

import type { CreateBranchProps } from '../branch/branch.aggregate';

const DEFAULTS: CreateBranchProps = {
  name: 'Main Branch',
  address: 'ул. Тестовая, 1',
  timezone: 'Europe/Moscow',
  idGen: new FakeIdGenerator(),
  now: DateTime.from('2024-01-15T10:00:00Z'),
};

export class BranchBuilder {
  private _props: CreateBranchProps = { ...DEFAULTS };

  withName(name: string): this {
    this._props = { ...this._props, name };
    return this;
  }

  withAddress(address: string): this {
    this._props = { ...this._props, address };
    return this;
  }

  withTimezone(timezone: string): this {
    this._props = { ...this._props, timezone };
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

  build(): Branch {
    return Branch.create(this._props);
  }
}
