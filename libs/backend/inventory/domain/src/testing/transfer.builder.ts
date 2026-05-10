import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId, SkuId, UserId } from '@det/shared-types';

import { TransferId } from '../transfer/transfer-id';
import { TransferLine } from '../transfer/transfer-line';
import { Transfer } from '../transfer/transfer.aggregate';

import type { CreateTransferProps } from '../transfer/transfer.aggregate';

const FROM = BranchId.from('22222222-2222-4222-a222-222222222222');
const TO = BranchId.from('33333333-3333-4333-a333-333333333333');
const USER = UserId.from('44444444-4444-4444-a444-444444444444');
const NOW = DateTime.from('2025-01-01T00:00:00Z');
const DEFAULT_SKU = SkuId.from('66666666-6666-4666-a666-666666666666');

let transferCounter = 0;
const transferIdGen: IIdGenerator = {
  generate(): string {
    transferCounter += 1;

    return `00000000-0000-4000-a200-${transferCounter.toString().padStart(12, '0')}`;
  },
};

export class TransferBuilder {
  private _from = FROM;
  private _to = TO;
  private readonly _lines: TransferLine[] = [];

  withFrom(branchId: BranchId): this {
    this._from = branchId;

    return this;
  }

  withTo(branchId: BranchId): this {
    this._to = branchId;

    return this;
  }

  withLine(amount: number, skuId?: SkuId): this {
    this._lines.push(
      TransferLine.create(skuId ?? DEFAULT_SKU, Quantity.of(amount, UnitOfMeasure.ML)),
    );

    return this;
  }

  build(): Transfer {
    const props: CreateTransferProps = {
      createdAt: NOW,
      createdBy: USER,
      fromBranchId: this._from,
      id: TransferId.generate(transferIdGen),
      lines: this._lines,
      toBranchId: this._to,
    };

    return Transfer.create(props);
  }
}
