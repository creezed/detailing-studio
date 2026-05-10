import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, Money } from '@det/backend-shared-ddd';
import type { BranchId, UserId } from '@det/shared-types';

import { AdjustmentStatus } from './adjustment-status';
import { AdjustmentAlreadyDecidedError, EmptyAdjustmentError } from './adjustment.errors';
import { AdjustmentApproved, AdjustmentCreated, AdjustmentRejected } from './adjustment.events';

import type { AdjustmentId } from './adjustment-id';
import type { AdjustmentLine } from './adjustment-line';

export interface AdjustmentSnapshot {
  readonly id: string;
  readonly branchId: string;
  readonly status: AdjustmentStatus;
  readonly reason: string;
  readonly lines: readonly {
    readonly skuId: string;
    readonly deltaAmount: number;
    readonly deltaUnit: string;
    readonly snapshotUnitCostCents: string;
  }[];
  readonly totalAmountCents: string;
  readonly createdBy: string;
  readonly approvedBy: string | null;
  readonly createdAt: string;
  readonly approvedAt: string | null;
}

export interface CreateAdjustmentProps {
  readonly id: AdjustmentId;
  readonly branchId: BranchId;
  readonly reason: string;
  readonly lines: readonly AdjustmentLine[];
  readonly createdBy: UserId;
  readonly createdAt: DateTime;
  readonly autoApprovalThreshold: Money;
}

export class Adjustment extends AggregateRoot<AdjustmentId> {
  private constructor(
    private readonly _id: AdjustmentId,
    private readonly _branchId: BranchId,
    private _status: AdjustmentStatus,
    private readonly _reason: string,
    private readonly _lines: readonly AdjustmentLine[],
    private readonly _totalAmountCents: bigint,
    private readonly _createdBy: UserId,
    private _approvedBy: UserId | null,
    private readonly _createdAt: DateTime,
    private _approvedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): AdjustmentId {
    return this._id;
  }

  get status(): AdjustmentStatus {
    return this._status;
  }

  get lines(): readonly AdjustmentLine[] {
    return this._lines;
  }

  get totalAmountCents(): bigint {
    return this._totalAmountCents;
  }

  static create(props: CreateAdjustmentProps): Adjustment {
    if (props.lines.length === 0) {
      throw new EmptyAdjustmentError();
    }

    const totalCents = Adjustment.computeTotalCents(props.lines);
    const absTotalCents = totalCents < 0n ? -totalCents : totalCents;
    const autoApprove = absTotalCents < props.autoApprovalThreshold.cents;

    const status = autoApprove ? AdjustmentStatus.APPROVED : AdjustmentStatus.PENDING;

    const adj = new Adjustment(
      props.id,
      props.branchId,
      status,
      props.reason,
      [...props.lines],
      totalCents,
      props.createdBy,
      autoApprove ? props.createdBy : null,
      props.createdAt,
      autoApprove ? props.createdAt : null,
    );

    adj.addEvent(new AdjustmentCreated(adj._id, status, props.createdAt));

    if (autoApprove) {
      adj.addEvent(
        new AdjustmentApproved(
          adj._id,
          adj._branchId,
          props.lines.map((l) => ({ delta: l.delta, skuId: l.skuId })),
          props.reason,
          props.createdBy,
          props.createdAt,
        ),
      );
    }

    return adj;
  }

  static restore(
    id: AdjustmentId,
    branchId: BranchId,
    status: AdjustmentStatus,
    reason: string,
    lines: readonly AdjustmentLine[],
    totalAmountCents: bigint,
    createdBy: UserId,
    approvedBy: UserId | null,
    createdAt: DateTime,
    approvedAt: DateTime | null,
  ): Adjustment {
    return new Adjustment(
      id,
      branchId,
      status,
      reason,
      lines,
      totalAmountCents,
      createdBy,
      approvedBy,
      createdAt,
      approvedAt,
    );
  }

  approve(by: UserId, at: DateTime): void {
    this.ensurePending();

    this._status = AdjustmentStatus.APPROVED;
    this._approvedBy = by;
    this._approvedAt = at;

    this.addEvent(
      new AdjustmentApproved(
        this._id,
        this._branchId,
        this._lines.map((l) => ({ delta: l.delta, skuId: l.skuId })),
        this._reason,
        by,
        at,
      ),
    );
  }

  reject(by: UserId, at: DateTime, reason: string): void {
    this.ensurePending();

    this._status = AdjustmentStatus.REJECTED;
    this.addEvent(new AdjustmentRejected(this._id, by, reason, at));
  }

  toSnapshot(): AdjustmentSnapshot {
    return {
      approvedAt: this._approvedAt !== null ? this._approvedAt.iso() : null,
      approvedBy: this._approvedBy !== null ? this._approvedBy : null,
      branchId: this._branchId,
      createdAt: this._createdAt.iso(),
      createdBy: this._createdBy,
      id: this._id,
      lines: this._lines.map((l) => ({
        deltaAmount: l.delta.amount,
        deltaUnit: l.delta.unit,
        skuId: l.skuId,
        snapshotUnitCostCents: l.snapshotUnitCost.cents.toString(),
      })),
      reason: this._reason,
      status: this._status,
      totalAmountCents: this._totalAmountCents.toString(),
    };
  }

  private ensurePending(): void {
    if (this._status !== AdjustmentStatus.PENDING) {
      throw new AdjustmentAlreadyDecidedError(this._id);
    }
  }

  private static computeTotalCents(lines: readonly AdjustmentLine[]): bigint {
    let total = 0n;

    for (const line of lines) {
      total += BigInt(Math.round(line.delta.amount * Number(line.snapshotUnitCost.cents)));
    }

    return total;
  }
}
