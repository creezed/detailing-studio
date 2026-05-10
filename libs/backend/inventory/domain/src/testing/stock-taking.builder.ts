import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId, SkuId, UserId } from '@det/shared-types';

import { StockTakingId } from '../stock-taking/stock-taking-id';
import { StockTaking } from '../stock-taking/stock-taking.aggregate';

import type {
  SnapshotLineInput,
  StartStockTakingProps,
} from '../stock-taking/stock-taking.aggregate';

const BRANCH = BranchId.from('22222222-2222-4222-a222-222222222222');
const USER = UserId.from('44444444-4444-4444-a444-444444444444');
const NOW = DateTime.from('2025-01-01T00:00:00Z');
const DEFAULT_SKU = SkuId.from('66666666-6666-4666-a666-666666666666');

let stCounter = 0;
const stIdGen: IIdGenerator = {
  generate(): string {
    stCounter += 1;

    return `00000000-0000-4000-a300-${stCounter.toString().padStart(12, '0')}`;
  },
};

export class StockTakingBuilder {
  private readonly _snapshotLines: SnapshotLineInput[] = [];

  withLine(expectedAmount: number, skuId?: SkuId): this {
    this._snapshotLines.push({
      expectedQuantity: Quantity.of(expectedAmount, UnitOfMeasure.ML),
      skuId: skuId ?? DEFAULT_SKU,
    });

    return this;
  }

  build(): StockTaking {
    const props: StartStockTakingProps = {
      branchId: BRANCH,
      createdBy: USER,
      id: StockTakingId.generate(stIdGen),
      snapshotLines: this._snapshotLines,
      startedAt: NOW,
    };

    return StockTaking.start(props);
  }
}
