import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, Quantity } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import { StockTakingLine } from './stock-taking-line';
import { StockTakingStatus } from './stock-taking-status';
import {
  StockTakingAlreadyPostedError,
  StockTakingNotStartedError,
  StockTakingSkuNotFoundError,
} from './stock-taking.errors';
import { StockTakingCancelled, StockTakingPosted, StockTakingStarted } from './stock-taking.events';

import type { StockTakingId } from './stock-taking-id';

export interface SnapshotLineInput {
  readonly skuId: SkuId;
  readonly expectedQuantity: Quantity;
}

export interface StartStockTakingProps {
  readonly id: StockTakingId;
  readonly branchId: BranchId;
  readonly createdBy: UserId;
  readonly startedAt: DateTime;
  readonly snapshotLines: readonly SnapshotLineInput[];
}

export class StockTaking extends AggregateRoot<StockTakingId> {
  private constructor(
    private readonly _id: StockTakingId,
    private readonly _branchId: BranchId,
    private _status: StockTakingStatus,
    private readonly _lines: StockTakingLine[],
    private readonly _createdBy: UserId,
    private readonly _startedAt: DateTime,
    private _completedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): StockTakingId {
    return this._id;
  }

  get status(): StockTakingStatus {
    return this._status;
  }

  get lines(): readonly StockTakingLine[] {
    return this._lines;
  }

  static start(props: StartStockTakingProps): StockTaking {
    const lines = props.snapshotLines.map((sl) =>
      StockTakingLine.create(sl.skuId, sl.expectedQuantity),
    );

    const st = new StockTaking(
      props.id,
      props.branchId,
      StockTakingStatus.STARTED,
      lines,
      props.createdBy,
      props.startedAt,
      null,
    );

    st.addEvent(new StockTakingStarted(st._id, props.branchId, props.startedAt));

    return st;
  }

  static restore(
    id: StockTakingId,
    branchId: BranchId,
    status: StockTakingStatus,
    lines: StockTakingLine[],
    createdBy: UserId,
    startedAt: DateTime,
    completedAt: DateTime | null,
  ): StockTaking {
    return new StockTaking(id, branchId, status, lines, createdBy, startedAt, completedAt);
  }

  recordMeasurement(skuId: SkuId, actual: Quantity): void {
    this.ensureStarted();

    const line = this._lines.find((l) => (l.skuId as string) === (skuId as string));

    if (!line) {
      throw new StockTakingSkuNotFoundError(skuId);
    }

    line.recordActual(actual);
  }

  post(by: UserId, at: DateTime): void {
    this.ensureStarted();

    this._status = StockTakingStatus.POSTED;
    this._completedAt = at;

    const deltas: {
      skuId: SkuId;
      delta: NonNullable<ReturnType<StockTakingLine['computeDelta']>>;
    }[] = [];

    for (const line of this._lines) {
      const delta = line.computeDelta();

      if (delta !== null && delta.amount !== 0) {
        deltas.push({ delta, skuId: line.skuId });
      }
    }

    this.addEvent(new StockTakingPosted(this._id, this._branchId, deltas, by, at));
  }

  cancel(at: DateTime): void {
    this.ensureStarted();

    this._status = StockTakingStatus.CANCELLED;
    this._completedAt = at;
    this.addEvent(new StockTakingCancelled(this._id, at));
  }

  private ensureStarted(): void {
    if (this._status === StockTakingStatus.POSTED) {
      throw new StockTakingAlreadyPostedError(this._id);
    }

    if (this._status !== StockTakingStatus.STARTED) {
      throw new StockTakingNotStartedError(this._id);
    }
  }
}
