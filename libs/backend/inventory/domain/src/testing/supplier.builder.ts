import { DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import { Supplier } from '../supplier/supplier.aggregate';
import { Inn } from '../value-objects/inn.value-object';

import type { CreateSupplierProps } from '../supplier/supplier.aggregate';
import type { ContactInfoProps } from '../value-objects/contact-info.value-object';

let counter = 0;

const stubIdGen: IIdGenerator = {
  generate(): string {
    counter += 1;

    return `00000000-0000-4000-b000-${counter.toString().padStart(12, '0')}`;
  },
};

export class SupplierBuilder {
  private _props: CreateSupplierProps = {
    idGen: stubIdGen,
    name: 'ООО Полироль',
    now: DateTime.from('2025-01-01T00:00:00Z'),
  };

  withName(value: string): this {
    this._props = { ...this._props, name: value };

    return this;
  }

  withInn(value: string): this {
    this._props = { ...this._props, inn: Inn.from(value) };

    return this;
  }

  withContact(value: ContactInfoProps): this {
    this._props = { ...this._props, contact: value };

    return this;
  }

  withNow(value: DateTime): this {
    this._props = { ...this._props, now: value };

    return this;
  }

  withIdGen(value: IIdGenerator): this {
    this._props = { ...this._props, idGen: value };

    return this;
  }

  build(): Supplier {
    return Supplier.create(this._props);
  }
}
