import { Quantity } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';

import { calculateDeviation } from './norm-deviation-calculator';

import type { ConsumptionLineId } from '../value-objects/consumption-line-id';
import type { WorkOrder } from '../work-order/work-order.aggregate';

export type WorkOrderClosingViolation =
  | { readonly kind: 'NO_BEFORE_PHOTO' }
  | { readonly kind: 'NO_AFTER_PHOTO' }
  | {
      readonly kind: 'DEVIATION_WITHOUT_REASON';
      readonly lineId: ConsumptionLineId;
      readonly skuId: string;
      readonly ratio: number;
    }
  | { readonly kind: 'NEGATIVE_QUANTITY'; readonly lineId: ConsumptionLineId };

export class ClosingValidator {
  constructor(private readonly _threshold = 0.15) {}

  validate(workOrder: WorkOrder): WorkOrderClosingViolation[] {
    const snapshot = workOrder.toSnapshot();
    const violations: WorkOrderClosingViolation[] = [];

    if (snapshot.photosBefore.length === 0) {
      violations.push({ kind: 'NO_BEFORE_PHOTO' });
    }

    if (snapshot.photosAfter.length === 0) {
      violations.push({ kind: 'NO_AFTER_PHOTO' });
    }

    for (const line of snapshot.lines) {
      if (line.actualAmount < 0) {
        violations.push({
          kind: 'NEGATIVE_QUANTITY',
          lineId: line.id as ConsumptionLineId,
        });
        continue;
      }

      const actual = Quantity.of(line.actualAmount, line.actualUnit as UnitOfMeasure);
      const norm = Quantity.of(line.normAmount, line.normUnit as UnitOfMeasure);
      const deviation = calculateDeviation(actual, norm, this._threshold);

      if (deviation.exceedsThreshold && !line.deviationReason) {
        violations.push({
          kind: 'DEVIATION_WITHOUT_REASON',
          lineId: line.id as ConsumptionLineId,
          skuId: line.skuId,
          ratio: deviation.ratio,
        });
      }
    }

    return violations;
  }
}
