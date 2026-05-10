import { DateTime, Money, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId, SkuId, SupplierId, UserId } from '@det/shared-types';

import { ReceiptId } from '../receipt/receipt-id';
import { Receipt } from '../receipt/receipt.aggregate';

import type { CreateReceiptLineProps } from '../receipt/receipt-line';
import type { CreateReceiptProps } from '../receipt/receipt.aggregate';

const SUPPLIER = SupplierId.from('55555555-5555-4555-a555-555555555555');
const BRANCH = BranchId.from('22222222-2222-4222-a222-222222222222');
const USER = UserId.from('44444444-4444-4444-a444-444444444444');
const NOW = DateTime.from('2025-01-01T00:00:00Z');

let receiptCounter = 0;
const receiptIdGen: IIdGenerator = {
  generate(): string {
    receiptCounter += 1;

    return `00000000-0000-4000-a000-${receiptCounter.toString().padStart(12, '0')}`;
  },
};

let lineCounter = 0;

export function defaultLineProps(
  overrides?: Partial<CreateReceiptLineProps>,
): CreateReceiptLineProps {
  lineCounter += 1;

  return {
    baseQuantity: Quantity.of(5000, UnitOfMeasure.ML),
    expiresAt: null,
    id: `line-${String(lineCounter)}`,
    packageQuantity: 1,
    packagingId: null,
    skuId: SkuId.from('66666666-6666-4666-a666-666666666666'),
    unitCost: Money.rub(100),
    ...overrides,
  };
}

export class ReceiptBuilder {
  private _props: CreateReceiptProps = {
    branchId: BRANCH,
    createdAt: NOW,
    createdBy: USER,
    id: ReceiptId.generate(receiptIdGen),
    supplierId: SUPPLIER,
  };

  private readonly _lineProps: CreateReceiptLineProps[] = [];
  private _posted = false;

  withSupplierId(value: SupplierId): this {
    this._props = { ...this._props, supplierId: value };

    return this;
  }

  withLine(overrides?: Partial<CreateReceiptLineProps>): this {
    this._lineProps.push(defaultLineProps(overrides));

    return this;
  }

  posted(): this {
    this._posted = true;

    return this;
  }

  build(): Receipt {
    const receipt = Receipt.create(this._props);

    for (const lp of this._lineProps) {
      receipt.addLine(lp, this._props.createdAt);
    }

    if (this._posted) {
      receipt.post(this._props.createdBy, this._props.createdAt);
    }

    return receipt;
  }
}
