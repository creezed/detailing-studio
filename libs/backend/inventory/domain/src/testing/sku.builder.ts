import { DateTime, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import { Sku } from '../sku/sku.aggregate';
import { Barcode } from '../value-objects/barcode.value-object';

import type { CreateSkuProps } from '../sku/sku.aggregate';
import type { Packaging } from '../value-objects/packaging.value-object';

let counter = 0;

const stubIdGen: IIdGenerator = {
  generate(): string {
    counter += 1;

    return `00000000-0000-4000-a000-${counter.toString().padStart(12, '0')}`;
  },
};

export class SkuBuilder {
  private _props: CreateSkuProps = {
    articleNumber: 'ART-001',
    baseUnit: UnitOfMeasure.ML,
    description: '',
    group: 'Полироли',
    hasExpiry: false,
    idGen: stubIdGen,
    name: 'Полироль 3М',
    now: DateTime.from('2025-01-01T00:00:00Z'),
    packagings: [],
  };

  withArticleNumber(value: string): this {
    this._props = { ...this._props, articleNumber: value };

    return this;
  }

  withName(value: string): this {
    this._props = { ...this._props, name: value };

    return this;
  }

  withGroup(value: string): this {
    this._props = { ...this._props, group: value };

    return this;
  }

  withBaseUnit(value: UnitOfMeasure): this {
    this._props = { ...this._props, baseUnit: value };

    return this;
  }

  withPackagings(value: readonly Packaging[]): this {
    this._props = { ...this._props, packagings: value };

    return this;
  }

  withBarcode(value: string): this {
    this._props = { ...this._props, barcode: Barcode.from(value) };

    return this;
  }

  withHasExpiry(value: boolean): this {
    this._props = { ...this._props, hasExpiry: value };

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

  build(): Sku {
    return Sku.create(this._props);
  }
}
