import { DateTime, Money, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId, SkuId, UserId } from '@det/shared-types';

import { AdjustmentId } from '../adjustment/adjustment-id';
import { AdjustmentLine } from '../adjustment/adjustment-line';
import { Adjustment } from '../adjustment/adjustment.aggregate';
import { SignedQuantity } from '../value-objects/signed-quantity.value-object';

import type { CreateAdjustmentProps } from '../adjustment/adjustment.aggregate';

const BRANCH = BranchId.from('22222222-2222-4222-a222-222222222222');
const USER = UserId.from('44444444-4444-4444-a444-444444444444');
const NOW = DateTime.from('2025-01-01T00:00:00Z');

let adjCounter = 0;
const adjIdGen: IIdGenerator = {
  generate(): string {
    adjCounter += 1;

    return `00000000-0000-4000-a100-${adjCounter.toString().padStart(12, '0')}`;
  },
};

export class AdjustmentBuilder {
  private readonly _lines: AdjustmentLine[] = [];
  private _threshold: Money = Money.rub(5000);
  private _reason = 'test adjustment';
  private readonly _branchId = BRANCH;

  withLine(deltaAmount: number, unitCostRubles: number, skuId?: SkuId): this {
    this._lines.push(
      AdjustmentLine.create(
        skuId ?? SkuId.from('66666666-6666-4666-a666-666666666666'),
        SignedQuantity.of(deltaAmount, UnitOfMeasure.ML),
        Money.rub(unitCostRubles),
      ),
    );

    return this;
  }

  withThreshold(rubles: number): this {
    this._threshold = Money.rub(rubles);

    return this;
  }

  withReason(reason: string): this {
    this._reason = reason;

    return this;
  }

  build(): Adjustment {
    const props: CreateAdjustmentProps = {
      autoApprovalThreshold: this._threshold,
      branchId: this._branchId,
      createdAt: NOW,
      createdBy: USER,
      id: AdjustmentId.generate(adjIdGen),
      lines: this._lines,
      reason: this._reason,
    };

    return Adjustment.create(props);
  }
}
