import { AggregateRoot, DateTime, Money, Quantity } from '@det/backend-shared-ddd';
import type { IIdGenerator, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, SupplierId, UserId } from '@det/shared-types';

import { BatchId } from './batch-id';
import { BatchSourceType } from './batch-source-type';
import { Batch } from './batch.entity';
import { StockId } from './stock-id';
import { InsufficientStockError, UnitMismatchError } from './stock.errors';
import {
  LowStockReached,
  OutOfStockReached,
  ReorderLevelChanged,
  StockAdjusted,
  StockConsumed,
  StockOpened,
  StockReceived,
  StockTransferredIn,
  StockTransferredOut,
} from './stock.events';

import type { BatchAllocation, IBatchSelector } from './batch-selector.interface';
import type { ConsumptionReason } from './consumption-reason';
import type { SignedQuantity } from '../value-objects/signed-quantity.value-object';

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

export interface WriteOffResult {
  readonly allocations: readonly BatchAllocation[];
  readonly totalCost: Money;
}

export interface TransferBatchDetail {
  readonly quantity: Quantity;
  readonly unitCost: Money;
  readonly expiresAt: DateTime | null;
}

export interface TransferDetails {
  readonly allocations: readonly TransferBatchDetail[];
  readonly totalAmount: Quantity;
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

  consume(
    amount: Quantity,
    reason: ConsumptionReason,
    batchSelector: IBatchSelector,
    at: DateTime,
  ): WriteOffResult {
    if (amount.unit !== this._baseUnit) {
      throw new UnitMismatchError(amount.unit, this._baseUnit);
    }

    const totalBefore = this.totalQuantity();

    if (amount.amount > totalBefore.amount) {
      throw new InsufficientStockError(this.id, totalBefore, amount);
    }

    const allocations = batchSelector.selectForConsumption(this._batches, amount, at);

    for (const alloc of allocations) {
      const batch = this._batches.find((b) => b.id === alloc.batchId);

      batch?.decrement(alloc.quantity);
    }

    this.removeDepleted();

    const totalCost = this.sumAllocationCost(allocations);

    this.addEvent(new StockConsumed(this.id, amount, reason, allocations, totalCost, at));

    const totalAfter = this.totalQuantity();

    if (totalAfter.amount === 0) {
      this.addEvent(new OutOfStockReached(this.id, at));
    } else if (
      totalAfter.amount <= this._reorderLevel.amount &&
      totalBefore.amount > this._reorderLevel.amount
    ) {
      this.addEvent(new LowStockReached(this.id, totalAfter, this._reorderLevel, at));
    }

    return { allocations, totalCost };
  }

  adjust(
    delta: SignedQuantity,
    reason: string,
    by: UserId,
    batchSelector: IBatchSelector,
    at: DateTime,
    idGen: IIdGenerator,
  ): void {
    if (delta.unit !== this._baseUnit) {
      throw new UnitMismatchError(delta.unit, this._baseUnit);
    }

    if (delta.isPositive()) {
      const batch = Batch.create({
        id: BatchId.generate(idGen),
        supplierId: null,
        sourceType: BatchSourceType.ADJUSTMENT,
        sourceDocId: reason,
        quantity: Quantity.of(delta.amount, this._baseUnit),
        unitCost: this._averageCost,
        expiresAt: null,
        receivedAt: at,
        baseUnit: this._baseUnit,
      });

      this._batches.push(batch);
    } else if (delta.isNegative()) {
      const absAmount = Quantity.of(Math.abs(delta.amount), this._baseUnit);
      const totalBefore = this.totalQuantity();

      if (absAmount.amount > totalBefore.amount) {
        throw new InsufficientStockError(this.id, totalBefore, absAmount);
      }

      const allocations = batchSelector.selectForConsumption(this._batches, absAmount, at);

      for (const alloc of allocations) {
        const batch = this._batches.find((b) => b.id === alloc.batchId);

        batch?.decrement(alloc.quantity);
      }

      this.removeDepleted();
    }

    this.addEvent(new StockAdjusted(this.id, delta.amount, reason, by, at));
  }

  transferOut(
    amount: Quantity,
    targetBranch: BranchId,
    batchSelector: IBatchSelector,
    at: DateTime,
  ): TransferDetails {
    if (amount.unit !== this._baseUnit) {
      throw new UnitMismatchError(amount.unit, this._baseUnit);
    }

    const totalBefore = this.totalQuantity();

    if (amount.amount > totalBefore.amount) {
      throw new InsufficientStockError(this.id, totalBefore, amount);
    }

    const allocations = batchSelector.selectForConsumption(this._batches, amount, at);

    for (const alloc of allocations) {
      const batch = this._batches.find((b) => b.id === alloc.batchId);

      batch?.decrement(alloc.quantity);
    }

    const batchDetails: TransferBatchDetail[] = allocations.map((alloc) => {
      const batch = this._batches.find((b) => b.id === alloc.batchId);

      return {
        quantity: alloc.quantity,
        unitCost: alloc.unitCost,
        expiresAt: batch?.expiresAt ?? null,
      };
    });

    this.removeDepleted();
    this.addEvent(new StockTransferredOut(this.id, amount, targetBranch, at));

    return { allocations: batchDetails, totalAmount: amount };
  }

  transferIn(transfer: TransferDetails, at: DateTime, idGen: IIdGenerator): void {
    for (const detail of transfer.allocations) {
      const batch = Batch.create({
        id: BatchId.generate(idGen),
        supplierId: null,
        sourceType: BatchSourceType.TRANSFER,
        sourceDocId: 'TRANSFER',
        quantity: detail.quantity,
        unitCost: detail.unitCost,
        expiresAt: detail.expiresAt,
        receivedAt: at,
        baseUnit: this._baseUnit,
      });

      this._batches.push(batch);
    }

    this.addEvent(new StockTransferredIn(this.id, transfer.totalAmount, at));
  }

  changeReorderLevel(newLevel: Quantity, now: DateTime): void {
    if (newLevel.unit !== this._baseUnit) {
      throw new UnitMismatchError(newLevel.unit, this._baseUnit);
    }

    this._reorderLevel = newLevel;
    this.addEvent(new ReorderLevelChanged(this.id, newLevel, now));
  }

  removeBatchesBySourceDoc(sourceDocId: string): void {
    for (let i = this._batches.length - 1; i >= 0; i--) {
      if (this._batches[i]?.sourceDocId === sourceDocId) {
        this._batches.splice(i, 1);
      }
    }
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

  private removeDepleted(): void {
    for (let i = this._batches.length - 1; i >= 0; i--) {
      if (this._batches[i]?.isDepleted()) {
        this._batches.splice(i, 1);
      }
    }
  }

  private sumAllocationCost(allocations: readonly BatchAllocation[]): Money {
    let totalCents = 0n;

    for (const alloc of allocations) {
      totalCents += BigInt(Math.round(alloc.quantity.amount * Number(alloc.unitCost.cents)));
    }

    return moneyFromCents(Number(totalCents));
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
