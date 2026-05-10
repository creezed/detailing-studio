import { Entity } from '@det/backend-shared-ddd';
import type { DateTime, Money, UnitOfMeasure, Quantity } from '@det/backend-shared-ddd';
import type { SupplierId } from '@det/shared-types';

import { BatchInsufficientError, UnitMismatchError } from './stock.errors';

import type { BatchId } from './batch-id';
import type { BatchSourceType } from './batch-source-type';

export interface CreateBatchProps {
  readonly id: BatchId;
  readonly supplierId: SupplierId | null;
  readonly sourceType: BatchSourceType;
  readonly sourceDocId: string;
  readonly quantity: Quantity;
  readonly unitCost: Money;
  readonly expiresAt: DateTime | null;
  readonly receivedAt: DateTime;
  readonly baseUnit: UnitOfMeasure;
}

export class Batch extends Entity<BatchId> {
  private _remainingQuantity: Quantity;

  private constructor(
    private readonly _id: BatchId,
    public readonly supplierId: SupplierId | null,
    public readonly sourceType: BatchSourceType,
    public readonly sourceDocId: string,
    public readonly initialQuantity: Quantity,
    remaining: Quantity,
    public readonly unitCost: Money,
    public readonly expiresAt: DateTime | null,
    public readonly receivedAt: DateTime,
  ) {
    super();
    this._remainingQuantity = remaining;
  }

  override get id(): BatchId {
    return this._id;
  }

  get remainingQuantity(): Quantity {
    return this._remainingQuantity;
  }

  static create(props: CreateBatchProps): Batch {
    if (props.quantity.unit !== props.baseUnit) {
      throw new UnitMismatchError(props.quantity.unit, props.baseUnit);
    }

    return new Batch(
      props.id,
      props.supplierId,
      props.sourceType,
      props.sourceDocId,
      props.quantity,
      props.quantity,
      props.unitCost,
      props.expiresAt,
      props.receivedAt,
    );
  }

  static restore(
    id: BatchId,
    supplierId: SupplierId | null,
    sourceType: BatchSourceType,
    sourceDocId: string,
    initialQuantity: Quantity,
    remainingQuantity: Quantity,
    unitCost: Money,
    expiresAt: DateTime | null,
    receivedAt: DateTime,
  ): Batch {
    return new Batch(
      id,
      supplierId,
      sourceType,
      sourceDocId,
      initialQuantity,
      remainingQuantity,
      unitCost,
      expiresAt,
      receivedAt,
    );
  }

  decrement(amount: Quantity): void {
    if (amount.amount > this._remainingQuantity.amount) {
      throw new BatchInsufficientError(this._id, this._remainingQuantity, amount);
    }

    this._remainingQuantity = this._remainingQuantity.subtract(amount);
  }

  isDepleted(): boolean {
    return this._remainingQuantity.amount === 0;
  }

  isExpired(at: DateTime): boolean {
    if (this.expiresAt === null) {
      return false;
    }

    return at.toDate().getTime() >= this.expiresAt.toDate().getTime();
  }
}
