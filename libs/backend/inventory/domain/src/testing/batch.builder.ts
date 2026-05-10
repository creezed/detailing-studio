import { DateTime, Money, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import type { SupplierId } from '@det/shared-types';

import { BatchId } from '../stock/batch-id';
import { BatchSourceType } from '../stock/batch-source-type';
import { Batch } from '../stock/batch.entity';

import type { CreateBatchProps } from '../stock/batch.entity';

let batchCounter = 0;

const batchIdGen: IIdGenerator = {
  generate(): string {
    batchCounter += 1;

    return `00000000-0000-4000-b000-${batchCounter.toString().padStart(12, '0')}`;
  },
};

export class BatchBuilder {
  private _props: CreateBatchProps = {
    baseUnit: UnitOfMeasure.ML,
    expiresAt: null,
    id: BatchId.generate(batchIdGen),
    quantity: Quantity.of(1000, UnitOfMeasure.ML),
    receivedAt: DateTime.from('2025-01-01T00:00:00Z'),
    sourceDocId: 'DOC-001',
    sourceType: BatchSourceType.RECEIPT,
    supplierId: null,
    unitCost: Money.rub(100),
  };

  withId(value: BatchId): this {
    this._props = { ...this._props, id: value };

    return this;
  }

  withSupplierId(value: SupplierId | null): this {
    this._props = { ...this._props, supplierId: value };

    return this;
  }

  withSourceType(value: BatchSourceType): this {
    this._props = { ...this._props, sourceType: value };

    return this;
  }

  withQuantity(amount: number, unit?: UnitOfMeasure): this {
    const u = unit ?? this._props.baseUnit;

    this._props = { ...this._props, quantity: Quantity.of(amount, u) };

    return this;
  }

  withUnitCost(rubles: number): this {
    this._props = { ...this._props, unitCost: Money.rub(rubles) };

    return this;
  }

  withExpiresAt(value: DateTime | null): this {
    this._props = { ...this._props, expiresAt: value };

    return this;
  }

  withBaseUnit(value: UnitOfMeasure): this {
    this._props = {
      ...this._props,
      baseUnit: value,
      quantity: Quantity.of(this._props.quantity.amount, value),
    };

    return this;
  }

  build(): Batch {
    return Batch.create(this._props);
  }
}
