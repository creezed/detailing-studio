import type { SkuId } from '@det/shared/types';

import type { BodyType } from './body-type';

export interface MaterialNorm {
  readonly skuId: SkuId;
  readonly amount: number;
  readonly bodyTypeCoefficients?: ReadonlyMap<BodyType, number>;
}
