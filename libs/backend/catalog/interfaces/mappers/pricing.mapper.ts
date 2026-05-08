import { PricingType } from '@det/backend/catalog/application';
import type { BodyType, MaterialNorm, ServicePricing } from '@det/backend/catalog/application';
import { Money } from '@det/backend/shared/ddd';
import { SkuId } from '@det/shared/types';

import { PricingTypeEnum } from '../dto/service.dto';

import type { MaterialNormDto, PricingDto } from '../dto/service.dto';

export function toDomainPricing(dto: PricingDto): ServicePricing {
  if (dto.type === PricingTypeEnum.FIXED) {
    return {
      price: centsToMoney(dto.fixedPriceCents ?? '0'),
      type: PricingType.FIXED,
    };
  }

  const prices = new Map<BodyType, Money>();

  for (const entry of dto.bodyTypePrices ?? []) {
    prices.set(entry.bodyType as BodyType, centsToMoney(entry.priceCents));
  }

  return {
    prices,
    type: PricingType.BY_BODY_TYPE,
  };
}

function centsToMoney(cents: string): Money {
  const c = BigInt(cents);
  const rubles = c / 100n;
  const remainder = c % 100n;

  return Money.rub(`${rubles.toString()}.${remainder.toString().padStart(2, '0')}`);
}

export function toDomainMaterialNorms(dtos: readonly MaterialNormDto[]): MaterialNorm[] {
  return dtos.map((dto) => {
    const norm: MaterialNorm = {
      amount: dto.amount,
      skuId: SkuId.from(dto.skuId),
    };

    if (dto.bodyTypeCoefficients && dto.bodyTypeCoefficients.length > 0) {
      const coefficients = new Map<BodyType, number>();

      for (const c of dto.bodyTypeCoefficients) {
        coefficients.set(c.bodyType as BodyType, c.coefficient);
      }

      return { ...norm, bodyTypeCoefficients: coefficients };
    }

    return norm;
  });
}
