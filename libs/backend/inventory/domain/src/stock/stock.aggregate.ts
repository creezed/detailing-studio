import { AggregateRoot, DateTime, Money, Quantity } from '@det/backend-shared-ddd';
import type { IIdGenerator, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, SupplierId } from '@det/shared-types';

import { BatchId } from './batch-id';
import { Batch } from './batch.entity';
import { StockId } from './stock-id';
import { UnitMismatchError } from './stock.errors';
import { ReorderLevelChanged, StockOpened, StockReceived } from './stock.events';

import type { BatchSourceType } from './batch-source-type';

export interface ReceiveBatchDetails {
  readonly idGen: IIdGenerator;
  readonly supplierId: SupplierId | null;
  readonly sourceType: BatchSourceType;
  readonly sourceDocId: string;
  readonly quantity: Quantity;
  readonly unitCost: Money;
  readonly expiresAt: DateTime | null;
  readonly receivedAt: DateTime;
}

export interface BatchSnapshot {
  readonly id: string;
  readonly supplierId: string | null;
  readonly sourceType: BatchSourceType;
  readonly sourceDocId: string;
  readonly initialQuantity: number;
  readonly remainingQuantity: number;
  readonly unitCostCents: string;
  readonly expiresAt: string | null;
  readonly receivedAt: string;
}

export interface StockSnapshot {
  readonly skuId: string;
  readonly branchId: string;
  readonly baseUnit: UnitOfMeasure;
  readonly reorderLevel: number;
  readonly averageCostCents: string;
  readonly batches: readonly BatchSnapshot[];
}

export class Stock extends AggregateRoot<StockId> {
  private constructor(
    private readonly _skuId: SkuId,
    private readonly _branchId: BranchId,
    private readonly _baseUnit: UnitOfMeasure,
    private readonly _batches: Batch[],
    private _reorderLevel: Quantity,
    private _averageCost: Money,
  ) {
    super();
  }

  override get id(): StockId {
    return StockId.of(this._skuId, this._branchId);
  }

  get skuId(): SkuId {
    return this._skuId;
  }

  get branchId(): BranchId {
    return this._branchId;
  }

  get batches(): readonly Batch[] {
    return this._batches;
  }

  get averageCost(): Money {
    return this._averageCost;
  }

  static createEmpty(
    skuId: SkuId,
    branchId: BranchId,
    baseUnit: UnitOfMeasure,
    reorderLevel: Quantity,
    now: DateTime,
  ): Stock {
    const stock = new Stock(skuId, branchId, baseUnit, [], reorderLevel, Money.rub(0));

    stock.addEvent(new StockOpened(stock.id, now));

    return stock;
  }

  static restore(snapshot: StockSnapshot): Stock {
    return new Stock(
      snapshot.skuId as unknown as SkuId,
      snapshot.branchId as unknown as BranchId,
      snapshot.baseUnit,
      snapshot.batches.map((b) =>
        Batch.restore(
          BatchId.from(b.id),
          b.supplierId !== null ? (b.supplierId as unknown as SupplierId) : null,
          b.sourceType,
          b.sourceDocId,
          Quantity.of(b.initialQuantity, snapshot.baseUnit),
          Quantity.of(b.remainingQuantity, snapshot.baseUnit),
          moneyFromCentsStr(b.unitCostCents),
          b.expiresAt !== null ? DateTime.from(b.expiresAt) : null,
          DateTime.from(b.receivedAt),
        ),
      ),
      Quantity.of(snapshot.reorderLevel, snapshot.baseUnit),
      moneyFromCentsStr(snapshot.averageCostCents),
    );
  }

  receive(details: ReceiveBatchDetails): void {
    if (details.quantity.unit !== this._baseUnit) {
      throw new UnitMismatchError(details.quantity.unit, this._baseUnit);
    }

    const batch = Batch.create({
      id: BatchId.generate(details.idGen),
      supplierId: details.supplierId,
      sourceType: details.sourceType,
      sourceDocId: details.sourceDocId,
      quantity: details.quantity,
      unitCost: details.unitCost,
      expiresAt: details.expiresAt,
      receivedAt: details.receivedAt,
      baseUnit: this._baseUnit,
    });

    this.recalculateAverageCost(details.quantity.amount, details.unitCost);
    this._batches.push(batch);
    this.addEvent(
      new StockReceived(this.id, details.quantity, details.unitCost, details.receivedAt),
    );
  }

  totalQuantity(): Quantity {
    let total = 0;

    for (const batch of this._batches) {
      total += batch.remainingQuantity.amount;
    }

    return Quantity.of(total, this._baseUnit);
  }

  changeReorderLevel(newLevel: Quantity, now: DateTime): void {
    if (newLevel.unit !== this._baseUnit) {
      throw new UnitMismatchError(newLevel.unit, this._baseUnit);
    }

    this._reorderLevel = newLevel;
    this.addEvent(new ReorderLevelChanged(this.id, newLevel, now));
  }

  toSnapshot(): StockSnapshot {
    return {
      averageCostCents: this._averageCost.cents.toString(),
      baseUnit: this._baseUnit,
      batches: this._batches.map((b) => ({
        expiresAt: b.expiresAt?.iso() ?? null,
        id: b.id,
        initialQuantity: b.initialQuantity.amount,
        receivedAt: b.receivedAt.iso(),
        remainingQuantity: b.remainingQuantity.amount,
        sourceDocId: b.sourceDocId,
        sourceType: b.sourceType,
        supplierId: b.supplierId,
        unitCostCents: b.unitCost.cents.toString(),
      })),
      branchId: this._branchId,
      reorderLevel: this._reorderLevel.amount,
      skuId: this._skuId,
    };
  }

  private recalculateAverageCost(newQtyAmount: number, newUnitCost: Money): void {
    const existingTotal = this.totalQuantity().amount;

    if (existingTotal <= 0) {
      this._averageCost = newUnitCost;

      return;
    }

    const existingCostCents = Number(this._averageCost.cents);
    const newCostCents = Number(newUnitCost.cents);
    const totalQty = existingTotal + newQtyAmount;
    const avgCents = Math.round(
      (existingTotal * existingCostCents + newQtyAmount * newCostCents) / totalQty,
    );

    this._averageCost = moneyFromCents(avgCents);
  }
}

function moneyFromCents(cents: number): Money {
  const rubles = Math.floor(cents / 100);
  const kopecks = cents % 100;

  return Money.rub(`${rubles.toString()}.${kopecks.toString().padStart(2, '0')}`);
}

function moneyFromCentsStr(centsStr: string): Money {
  return moneyFromCents(Number(centsStr));
}
