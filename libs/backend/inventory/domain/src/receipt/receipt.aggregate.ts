import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { BranchId, SupplierId, UserId } from '@det/shared-types';

import { ReceiptLine } from './receipt-line';
import { ReceiptStatus } from './receipt-status';
import {
  EmptyReceiptError,
  ReceiptAlreadyPostedError,
  ReceiptCannotEditAfterPostError,
  ReceiptNotPostedError,
} from './receipt.errors';
import {
  ReceiptCancelled,
  ReceiptCreated,
  ReceiptInvoiceAttached,
  ReceiptLineAdded,
  ReceiptLineRemoved,
  ReceiptLineUpdated,
  ReceiptPosted,
} from './receipt.events';

import type { ReceiptId } from './receipt-id';
import type { CreateReceiptLineProps } from './receipt-line';

export interface CreateReceiptProps {
  readonly id: ReceiptId;
  readonly supplierId: SupplierId;
  readonly branchId: BranchId;
  readonly createdBy: UserId;
  readonly createdAt: DateTime;
  readonly supplierInvoiceNumber?: string | null;
  readonly supplierInvoiceDate?: DateTime | null;
}

export class Receipt extends AggregateRoot<ReceiptId> {
  private constructor(
    private readonly _id: ReceiptId,
    private readonly _supplierId: SupplierId,
    private readonly _branchId: BranchId,
    private _status: ReceiptStatus,
    private readonly _lines: ReceiptLine[],
    private readonly _supplierInvoiceNumber: string | null,
    private readonly _supplierInvoiceDate: DateTime | null,
    private _attachmentUrl: string | null,
    private readonly _createdBy: UserId,
    private _postedBy: UserId | null,
    private readonly _createdAt: DateTime,
    private _postedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): ReceiptId {
    return this._id;
  }

  get supplierId(): SupplierId {
    return this._supplierId;
  }

  get branchId(): BranchId {
    return this._branchId;
  }

  get status(): ReceiptStatus {
    return this._status;
  }

  get lines(): readonly ReceiptLine[] {
    return this._lines;
  }

  static create(props: CreateReceiptProps): Receipt {
    const receipt = new Receipt(
      props.id,
      props.supplierId,
      props.branchId,
      ReceiptStatus.DRAFT,
      [],
      props.supplierInvoiceNumber ?? null,
      props.supplierInvoiceDate ?? null,
      null,
      props.createdBy,
      null,
      props.createdAt,
      null,
    );

    receipt.addEvent(new ReceiptCreated(receipt._id, props.createdAt));

    return receipt;
  }

  static restore(
    id: ReceiptId,
    supplierId: SupplierId,
    branchId: BranchId,
    status: ReceiptStatus,
    lines: ReceiptLine[],
    supplierInvoiceNumber: string | null,
    supplierInvoiceDate: DateTime | null,
    attachmentUrl: string | null,
    createdBy: UserId,
    postedBy: UserId | null,
    createdAt: DateTime,
    postedAt: DateTime | null,
  ): Receipt {
    return new Receipt(
      id,
      supplierId,
      branchId,
      status,
      lines,
      supplierInvoiceNumber,
      supplierInvoiceDate,
      attachmentUrl,
      createdBy,
      postedBy,
      createdAt,
      postedAt,
    );
  }

  addLine(lineProps: CreateReceiptLineProps, at: DateTime): void {
    this.ensureDraft();

    this._lines.push(ReceiptLine.create(lineProps));
    this.addEvent(new ReceiptLineAdded(this._id, lineProps.id, at));
  }

  updateLine(lineId: string, lineProps: CreateReceiptLineProps, at: DateTime): void {
    this.ensureDraft();

    const idx = this._lines.findIndex((l) => l.id === lineId);

    if (idx < 0) {
      return;
    }

    this._lines[idx] = ReceiptLine.create(lineProps);
    this.addEvent(new ReceiptLineUpdated(this._id, lineId, at));
  }

  removeLine(lineId: string, at: DateTime): void {
    this.ensureDraft();

    const idx = this._lines.findIndex((l) => l.id === lineId);

    if (idx < 0) {
      return;
    }

    this._lines.splice(idx, 1);
    this.addEvent(new ReceiptLineRemoved(this._id, lineId, at));
  }

  attachInvoiceFile(url: string, at: DateTime): void {
    this.ensureDraft();

    this._attachmentUrl = url;
    this.addEvent(new ReceiptInvoiceAttached(this._id, url, at));
  }

  post(by: UserId, at: DateTime): void {
    this.ensureDraft();

    if (this._lines.length === 0) {
      throw new EmptyReceiptError(this._id);
    }

    this._status = ReceiptStatus.POSTED;
    this._postedBy = by;
    this._postedAt = at;

    const lineSnapshots = this._lines.map((l) => ({
      baseQuantity: l.baseQuantity,
      expiresAt: l.expiresAt,
      skuId: l.skuId,
      unitCost: l.unitCost,
    }));

    this.addEvent(new ReceiptPosted(this._id, this._supplierId, this._branchId, lineSnapshots, at));
  }

  cancel(reason: string, at: DateTime): void {
    if (this._status !== ReceiptStatus.POSTED) {
      throw new ReceiptNotPostedError(this._id);
    }

    this._status = ReceiptStatus.CANCELLED;
    this.addEvent(new ReceiptCancelled(this._id, reason, at));
  }

  private ensureDraft(): void {
    if (this._status !== ReceiptStatus.DRAFT) {
      if (this._status === ReceiptStatus.POSTED) {
        throw new ReceiptAlreadyPostedError(this._id);
      }

      throw new ReceiptCannotEditAfterPostError(this._id);
    }
  }
}
