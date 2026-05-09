import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { SkuId } from '@det/shared-types';

import type { BodyType } from './body-type';

export interface MaterialNorm {
  readonly skuId: SkuId;
  readonly amount: number;
  readonly unit: UnitOfMeasure;
  readonly bodyTypeCoefficients?: ReadonlyMap<BodyType, number>;
}
