import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { BranchId, UserId } from '@det/shared-types';

import { TransferStatus } from './transfer-status';
import {
  EmptyTransferError,
  SameBranchTransferError,
  TransferAlreadyPostedError,
  TransferNotDraftError,
} from './transfer.errors';
import { TransferCancelled, TransferCreated, TransferPosted } from './transfer.events';

import type { TransferId } from './transfer-id';
import type { TransferLine } from './transfer-line';

export interface TransferSnapshot {
  readonly id: string;
  readonly fromBranchId: string;
  readonly toBranchId: string;
  readonly status: TransferStatus;
  readonly lines: readonly {
    readonly skuId: string;
    readonly quantity: { readonly amount: number; readonly unit: string };
  }[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly postedBy: string | null;
  readonly postedAt: string | null;
}

export interface CreateTransferProps {
  readonly id: TransferId;
  readonly fromBranchId: BranchId;
  readonly toBranchId: BranchId;
  readonly lines: readonly TransferLine[];
  readonly createdBy: UserId;
  readonly createdAt: DateTime;
}

export class Transfer extends AggregateRoot<TransferId> {
  private constructor(
    private readonly _id: TransferId,
    private readonly _fromBranchId: BranchId,
    private readonly _toBranchId: BranchId,
    private _status: TransferStatus,
    private readonly _lines: readonly TransferLine[],
    private readonly _createdBy: UserId,
    private readonly _createdAt: DateTime,
    private _postedBy: UserId | null,
    private _postedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): TransferId {
    return this._id;
  }

  get status(): TransferStatus {
    return this._status;
  }

  get lines(): readonly TransferLine[] {
    return this._lines;
  }

  get fromBranchId(): BranchId {
    return this._fromBranchId;
  }

  get toBranchId(): BranchId {
    return this._toBranchId;
  }

  static create(props: CreateTransferProps): Transfer {
    if ((props.fromBranchId as string) === (props.toBranchId as string)) {
      throw new SameBranchTransferError();
    }

    if (props.lines.length === 0) {
      throw new EmptyTransferError();
    }

    const transfer = new Transfer(
      props.id,
      props.fromBranchId,
      props.toBranchId,
      TransferStatus.DRAFT,
      [...props.lines],
      props.createdBy,
      props.createdAt,
      null,
      null,
    );

    transfer.addEvent(new TransferCreated(transfer._id, props.createdAt));

    return transfer;
  }

  static restore(
    id: TransferId,
    fromBranchId: BranchId,
    toBranchId: BranchId,
    status: TransferStatus,
    lines: readonly TransferLine[],
    createdBy: UserId,
    createdAt: DateTime,
    postedBy: UserId | null,
    postedAt: DateTime | null,
  ): Transfer {
    return new Transfer(
      id,
      fromBranchId,
      toBranchId,
      status,
      lines,
      createdBy,
      createdAt,
      postedBy,
      postedAt,
    );
  }

  post(by: UserId, at: DateTime): void {
    if (this._status === TransferStatus.POSTED) {
      throw new TransferAlreadyPostedError(this._id);
    }

    if (this._status !== TransferStatus.DRAFT) {
      throw new TransferNotDraftError(this._id);
    }

    this._status = TransferStatus.POSTED;
    this._postedBy = by;
    this._postedAt = at;

    this.addEvent(
      new TransferPosted(
        this._id,
        this._fromBranchId,
        this._toBranchId,
        this._lines.map((l) => ({ quantity: l.quantity, skuId: l.skuId })),
        by,
        at,
      ),
    );
  }

  cancel(at: DateTime): void {
    if (this._status !== TransferStatus.DRAFT) {
      throw new TransferNotDraftError(this._id);
    }

    this._status = TransferStatus.CANCELLED;
    this.addEvent(new TransferCancelled(this._id, at));
  }

  toSnapshot(): TransferSnapshot {
    return {
      createdAt: this._createdAt.iso(),
      createdBy: this._createdBy,
      fromBranchId: this._fromBranchId,
      id: this._id,
      lines: this._lines.map((l) => ({
        quantity: { amount: l.quantity.amount, unit: l.quantity.unit },
        skuId: l.skuId,
      })),
      postedAt: this._postedAt !== null ? this._postedAt.iso() : null,
      postedBy: this._postedBy !== null ? this._postedBy : null,
      status: this._status,
      toBranchId: this._toBranchId,
    };
  }
}
