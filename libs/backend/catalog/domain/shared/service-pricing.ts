import type { Money } from '@det/backend/shared/ddd';

import type { BodyType } from './body-type';

export enum PricingType {
  FIXED = 'FIXED',
  BY_BODY_TYPE = 'BY_BODY_TYPE',
}

export interface FixedPricing {
  readonly type: PricingType.FIXED;
  readonly price: Money;
}

export interface ByBodyTypePricing {
  readonly type: PricingType.BY_BODY_TYPE;
  readonly prices: ReadonlyMap<BodyType, Money>;
}

export type ServicePricing = FixedPricing | ByBodyTypePricing;
