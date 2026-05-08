import { DateTime, Money } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';
import { ServiceCategoryId, SkuId } from '@det/shared/types';

import { Service } from './service.aggregate';
import {
  InvalidDurationError,
  InvalidPricingError,
  ServiceAlreadyDeactivatedError,
} from './service.errors';
import {
  ServiceCreated,
  ServiceDeactivated,
  ServiceMaterialNormsChanged,
  ServicePriceChanged,
} from './service.events';
import { BodyType } from '../shared/body-type';
import { PricingType } from '../shared/service-pricing';

import type { MaterialNorm } from '../shared/material-norm';
import type { ServicePricing } from '../shared/service-pricing';

class FixedIdGenerator implements IIdGenerator {
  private _currentIndex = 0;

  constructor(private readonly _values: readonly string[]) {}

  generate(): string {
    const value = this._values[this._currentIndex];

    if (value === undefined) {
      throw new Error('No generated id configured for test');
    }

    this._currentIndex += 1;

    return value;
  }
}

const SERVICE_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const SKU_ID_1 = '33333333-3333-4333-8333-333333333333';
const SKU_ID_2 = '44444444-4444-4444-8444-444444444444';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const LATER = DateTime.from('2026-01-02T10:00:00.000Z');

function idGen(): IIdGenerator {
  return new FixedIdGenerator([SERVICE_ID]);
}

function fixedPricing(amount: number): ServicePricing {
  return { price: Money.rub(amount), type: PricingType.FIXED };
}

function byBodyTypePricing(prices: Array<[BodyType, number]>): ServicePricing {
  return {
    prices: new Map(prices.map(([bt, amount]) => [bt, Money.rub(amount)])),
    type: PricingType.BY_BODY_TYPE,
  };
}

function sampleNorms(): MaterialNorm[] {
  return [
    { amount: 50, skuId: SkuId.from(SKU_ID_1) },
    { amount: 100, skuId: SkuId.from(SKU_ID_2) },
  ];
}

function activeService(
  overrides: Partial<{
    durationMinutes: number;
    pricing: ServicePricing;
    materialNorms: readonly MaterialNorm[];
  }> = {},
): Service {
  return Service.create({
    categoryId: ServiceCategoryId.from(CATEGORY_ID),
    description: 'Full body polish',
    displayOrder: 1,
    durationMinutes: overrides.durationMinutes ?? 60,
    idGen: idGen(),
    materialNorms: overrides.materialNorms ?? [],
    name: 'Полировка кузова',
    now: NOW,
    pricing: overrides.pricing ?? fixedPricing(5000),
  });
}

describe('Service', () => {
  describe('create', () => {
    it('creates an active service with correct snapshot', () => {
      const service = activeService();
      const snapshot = service.toSnapshot();

      expect(snapshot).toMatchObject({
        categoryId: CATEGORY_ID,
        description: 'Full body polish',
        displayOrder: 1,
        durationMinutes: 60,
        id: SERVICE_ID,
        isActive: true,
        name: 'Полировка кузова',
        version: 1,
      });
    });

    it('publishes ServiceCreated event', () => {
      const service = activeService();
      const events = service.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ServiceCreated);
      expect(events[0]).toMatchObject({
        aggregateId: SERVICE_ID,
        aggregateType: 'Service',
        eventType: 'ServiceCreated',
      });
    });

    it('creates with BY_BODY_TYPE pricing', () => {
      const pricing = byBodyTypePricing([
        [BodyType.SEDAN, 3000],
        [BodyType.SUV, 5000],
      ]);
      const service = activeService({ pricing });
      const snapshot = service.toSnapshot();

      expect(snapshot.pricing.type).toBe(PricingType.BY_BODY_TYPE);
    });

    it('creates with material norms', () => {
      const norms = sampleNorms();
      const service = activeService({ materialNorms: norms });

      expect(service.toSnapshot().materialNorms).toHaveLength(2);
      expect(service.toSnapshot().materialNorms[0]).toMatchObject({
        amount: 50,
        skuId: SKU_ID_1,
      });
    });
  });

  describe('duration invariants', () => {
    it.each([0, -15, 7, 10, 1, 22])('rejects invalid duration %d', (duration) => {
      expect(() => activeService({ durationMinutes: duration })).toThrow(InvalidDurationError);
    });

    it.each([15, 30, 45, 60, 90, 120])('accepts valid duration %d', (duration) => {
      expect(() => activeService({ durationMinutes: duration })).not.toThrow();
    });
  });

  describe('pricing invariants', () => {
    it('rejects BY_BODY_TYPE with empty prices map', () => {
      const pricing: ServicePricing = {
        prices: new Map(),
        type: PricingType.BY_BODY_TYPE,
      };

      expect(() => activeService({ pricing })).toThrow(InvalidPricingError);
    });

    it('accepts BY_BODY_TYPE with at least one price', () => {
      const pricing = byBodyTypePricing([[BodyType.SEDAN, 3000]]);

      expect(() => activeService({ pricing })).not.toThrow();
    });
  });

  describe('calculatePrice', () => {
    it('returns fixed price regardless of body type', () => {
      const service = activeService({ pricing: fixedPricing(5000) });

      expect(service.calculatePrice(BodyType.SEDAN).toNumber()).toBe(5000);
      expect(service.calculatePrice(BodyType.SUV).toNumber()).toBe(5000);
    });

    it('returns body-type-specific price', () => {
      const pricing = byBodyTypePricing([
        [BodyType.SEDAN, 3000],
        [BodyType.SUV, 5000],
      ]);
      const service = activeService({ pricing });

      expect(service.calculatePrice(BodyType.SEDAN).toNumber()).toBe(3000);
      expect(service.calculatePrice(BodyType.SUV).toNumber()).toBe(5000);
    });

    it('throws if body type has no price', () => {
      const pricing = byBodyTypePricing([[BodyType.SEDAN, 3000]]);
      const service = activeService({ pricing });

      expect(() => service.calculatePrice(BodyType.MINIVAN)).toThrow(InvalidPricingError);
    });
  });

  describe('changePrice', () => {
    it('updates pricing and publishes ServicePriceChanged', () => {
      const service = activeService();
      service.pullDomainEvents();

      const newPricing = fixedPricing(6000);
      service.changePrice(newPricing, LATER);

      expect(service.toSnapshot().pricing.fixedPriceCents).toBe('600000');
      expect(service.toSnapshot().version).toBe(2);

      const events = service.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ServicePriceChanged);
    });

    it('rejects invalid pricing on change', () => {
      const service = activeService();
      const invalidPricing: ServicePricing = {
        prices: new Map(),
        type: PricingType.BY_BODY_TYPE,
      };

      expect(() => {
        service.changePrice(invalidPricing, LATER);
      }).toThrow(InvalidPricingError);
    });

    it('throws on deactivated service', () => {
      const service = activeService();
      service.deactivate(NOW);

      expect(() => {
        service.changePrice(fixedPricing(7000), LATER);
      }).toThrow(ServiceAlreadyDeactivatedError);
    });
  });

  describe('setDuration', () => {
    it('updates duration', () => {
      const service = activeService();
      service.setDuration(90);

      expect(service.toSnapshot().durationMinutes).toBe(90);
      expect(service.toSnapshot().version).toBe(2);
    });

    it('rejects invalid duration', () => {
      const service = activeService();

      expect(() => {
        service.setDuration(10);
      }).toThrow(InvalidDurationError);
    });

    it('throws on deactivated service', () => {
      const service = activeService();
      service.deactivate(NOW);

      expect(() => {
        service.setDuration(30);
      }).toThrow(ServiceAlreadyDeactivatedError);
    });
  });

  describe('setNorms', () => {
    it('updates norms and publishes ServiceMaterialNormsChanged', () => {
      const service = activeService();
      service.pullDomainEvents();

      const norms = sampleNorms();
      service.setNorms(norms, LATER);

      expect(service.toSnapshot().materialNorms).toHaveLength(2);
      expect(service.toSnapshot().version).toBe(2);

      const events = service.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ServiceMaterialNormsChanged);
    });

    it('throws on deactivated service', () => {
      const service = activeService();
      service.deactivate(NOW);

      expect(() => {
        service.setNorms([], LATER);
      }).toThrow(ServiceAlreadyDeactivatedError);
    });
  });

  describe('deactivate', () => {
    it('deactivates service and publishes ServiceDeactivated', () => {
      const service = activeService();
      service.pullDomainEvents();

      service.deactivate(LATER);

      expect(service.toSnapshot().isActive).toBe(false);
      expect(service.toSnapshot().version).toBe(2);

      const events = service.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ServiceDeactivated);
    });

    it('throws when already deactivated', () => {
      const service = activeService();
      service.deactivate(NOW);

      expect(() => {
        service.deactivate(LATER);
      }).toThrow(ServiceAlreadyDeactivatedError);
    });
  });

  describe('restore', () => {
    it('restores from snapshot without events', () => {
      const original = activeService({ materialNorms: sampleNorms() });
      const snapshot = original.toSnapshot();
      const restored = Service.restore(snapshot);

      expect(restored.toSnapshot()).toEqual(snapshot);
      expect(restored.pullDomainEvents()).toEqual([]);
    });

    it('restores BY_BODY_TYPE pricing correctly', () => {
      const pricing = byBodyTypePricing([
        [BodyType.SEDAN, 3000],
        [BodyType.SUV, 5000],
      ]);
      const service = activeService({ pricing });
      const restored = Service.restore(service.toSnapshot());

      expect(restored.calculatePrice(BodyType.SEDAN).toNumber()).toBe(3000);
      expect(restored.calculatePrice(BodyType.SUV).toNumber()).toBe(5000);
    });

    it('restores norms with body type coefficients', () => {
      const norms: MaterialNorm[] = [
        {
          amount: 50,
          bodyTypeCoefficients: new Map([[BodyType.SUV, 1.5]]),
          skuId: SkuId.from(SKU_ID_1),
        },
      ];
      const service = activeService({ materialNorms: norms });
      const snapshot = service.toSnapshot();

      expect(snapshot.materialNorms[0]?.bodyTypeCoefficients).toEqual([
        { bodyType: 'SUV', coefficient: 1.5 },
      ]);

      const restored = Service.restore(snapshot);
      expect(restored.toSnapshot()).toEqual(snapshot);
    });
  });
});
