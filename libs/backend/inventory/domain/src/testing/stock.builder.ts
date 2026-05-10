import { DateTime, Money, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId, SkuId } from '@det/shared-types';

import { BatchSourceType } from '../stock/batch-source-type';
import { Stock } from '../stock/stock.aggregate';

import type { ReceiveBatchDetails } from '../stock/stock.aggregate';

const SKU_ID = SkuId.from('11111111-1111-4111-a111-111111111111');
const BRANCH_ID = BranchId.from('22222222-2222-4222-a222-222222222222');
const NOW = DateTime.from('2025-01-01T00:00:00Z');

let stockCounter = 0;

const stockIdGen: IIdGenerator = {
  generate(): string {
    stockCounter += 1;

    return `00000000-0000-4000-9000-${stockCounter.toString().padStart(12, '0')}`;
  },
};

export class StockBuilder {
  private _skuId: SkuId = SKU_ID;
  private _branchId: BranchId = BRANCH_ID;
  private _baseUnit: UnitOfMeasure = UnitOfMeasure.ML;
  private _reorderLevel: Quantity = Quantity.of(100, UnitOfMeasure.ML);
  private readonly _now: DateTime = NOW;
  private readonly _receives: ReceiveBatchDetails[] = [];

  withSkuId(value: SkuId): this {
    this._skuId = value;

    return this;
  }

  withBranchId(value: BranchId): this {
    this._branchId = value;

    return this;
  }

  withBaseUnit(value: UnitOfMeasure): this {
    this._baseUnit = value;
    this._reorderLevel = Quantity.of(this._reorderLevel.amount, value);

    return this;
  }

  withReorderLevel(amount: number): this {
    this._reorderLevel = Quantity.of(amount, this._baseUnit);

    return this;
  }

  withReceive(quantityAmount: number, unitCostRubles: number, idGen?: IIdGenerator): this {
    this._receives.push({
      expiresAt: null,
      idGen: idGen ?? stockIdGen,
      quantity: Quantity.of(quantityAmount, this._baseUnit),
      receivedAt: this._now,
      sourceDocId: `DOC-${String(this._receives.length + 1)}`,
      sourceType: BatchSourceType.RECEIPT,
      supplierId: null,
      unitCost: Money.rub(unitCostRubles),
    });

    return this;
  }

  build(): Stock {
    const stock = Stock.createEmpty(
      this._skuId,
      this._branchId,
      this._baseUnit,
      this._reorderLevel,
      this._now,
    );

    for (const r of this._receives) {
      stock.receive(r);
    }

    return stock;
  }
}
