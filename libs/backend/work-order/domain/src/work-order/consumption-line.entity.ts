import { Entity, InvalidQuantityError, Quantity } from '@det/backend-shared-ddd';
import type { IIdGenerator, UnitOfMeasure } from '@det/backend-shared-ddd';

import { ConsumptionLineId } from '../value-objects/consumption-line-id';

export interface ConsumptionLineSnapshot {
  readonly id: string;
  readonly skuId: string;
  readonly actualAmount: number;
  readonly actualUnit: string;
  readonly normAmount: number;
  readonly normUnit: string;
  readonly deviationReason: string | null;
  readonly comment: string | null;
}

export class ConsumptionLine extends Entity<ConsumptionLineId> {
  private constructor(
    private readonly _id: ConsumptionLineId,
    private readonly _skuId: string,
    private _actualAmount: Quantity,
    private readonly _normAmount: Quantity,
    private _deviationReason: string | null,
    private _comment: string | null,
  ) {
    super();
  }

  override get id(): ConsumptionLineId {
    return this._id;
  }

  get skuId(): string {
    return this._skuId;
  }

  get actualAmount(): Quantity {
    return this._actualAmount;
  }

  get normAmount(): Quantity {
    return this._normAmount;
  }

  get deviationReason(): string | null {
    return this._deviationReason;
  }

  get comment(): string | null {
    return this._comment;
  }

  static draft(skuId: string, normAmount: Quantity, idGen: IIdGenerator): ConsumptionLine {
    return new ConsumptionLine(
      ConsumptionLineId.generate(idGen),
      skuId,
      Quantity.of(0, normAmount.unit),
      normAmount,
      null,
      null,
    );
  }

  static create(
    skuId: string,
    actualAmount: Quantity,
    idGen: IIdGenerator,
    deviationReason?: string,
    comment?: string,
  ): ConsumptionLine {
    return new ConsumptionLine(
      ConsumptionLineId.generate(idGen),
      skuId,
      actualAmount,
      Quantity.of(0, actualAmount.unit),
      deviationReason ?? null,
      comment ?? null,
    );
  }

  static restore(snapshot: ConsumptionLineSnapshot): ConsumptionLine {
    return new ConsumptionLine(
      ConsumptionLineId.from(snapshot.id),
      snapshot.skuId,
      Quantity.of(snapshot.actualAmount, snapshot.actualUnit as UnitOfMeasure),
      Quantity.of(snapshot.normAmount, snapshot.normUnit as UnitOfMeasure),
      snapshot.deviationReason,
      snapshot.comment,
    );
  }

  update(actualAmount: Quantity, deviationReason?: string, comment?: string): void {
    if (actualAmount.amount < 0) {
      throw new InvalidQuantityError(actualAmount.amount);
    }
    this._actualAmount = actualAmount;
    this._deviationReason = deviationReason ?? this._deviationReason;
    this._comment = comment ?? this._comment;
  }

  currentDeviationRatio(): number {
    if (this._normAmount.amount === 0) {
      return this._actualAmount.amount === 0 ? 0 : Infinity;
    }
    return Math.abs(this._actualAmount.amount - this._normAmount.amount) / this._normAmount.amount;
  }

  toSnapshot(): ConsumptionLineSnapshot {
    return {
      id: this._id,
      skuId: this._skuId,
      actualAmount: this._actualAmount.amount,
      actualUnit: this._actualAmount.unit,
      normAmount: this._normAmount.amount,
      normUnit: this._normAmount.unit,
      deviationReason: this._deviationReason,
      comment: this._comment,
    };
  }
}
