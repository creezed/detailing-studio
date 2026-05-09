import { AggregateRoot, Money } from '@det/backend-shared-ddd';
import type { DateTime, IIdGenerator } from '@det/backend-shared-ddd';

import { ServiceId } from './service-id';
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
import { PricingType } from '../shared/service-pricing';

import type { ServiceCategoryId } from '../service-category/service-category-id';
import type { BodyType } from '../shared/body-type';
import type { MaterialNorm } from '../shared/material-norm';
import type { ServicePricing } from '../shared/service-pricing';

export interface CreateServiceProps {
  readonly name: string;
  readonly description: string;
  readonly categoryId: ServiceCategoryId;
  readonly durationMinutes: number;
  readonly pricing: ServicePricing;
  readonly materialNorms: readonly MaterialNorm[];
  readonly displayOrder: number;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface ServiceSnapshot {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly categoryId: string;
  readonly durationMinutes: number;
  readonly pricing: ServicePricingSnapshot;
  readonly materialNorms: readonly MaterialNormSnapshot[];
  readonly isActive: boolean;
  readonly displayOrder: number;
  readonly version: number;
}

export interface ServicePricingSnapshot {
  readonly type: PricingType;
  readonly fixedPriceCents?: string;
  readonly bodyTypePrices?: ReadonlyArray<{
    readonly bodyType: string;
    readonly priceCents: string;
  }>;
}

export interface MaterialNormSnapshot {
  readonly skuId: string;
  readonly amount: number;
  readonly unit: string;
  readonly bodyTypeCoefficients?: ReadonlyArray<{
    readonly bodyType: string;
    readonly coefficient: number;
  }>;
}

export class Service extends AggregateRoot<ServiceId> {
  private constructor(
    private readonly _id: ServiceId,
    private _name: string,
    private _description: string,
    private readonly _categoryId: ServiceCategoryId,
    private _durationMinutes: number,
    private _pricing: ServicePricing,
    private _materialNorms: readonly MaterialNorm[],
    private _isActive: boolean,
    private readonly _displayOrder: number,
    private _version: number,
  ) {
    super();
  }

  override get id(): ServiceId {
    return this._id;
  }

  static create(props: CreateServiceProps): Service {
    Service.validateDuration(props.durationMinutes);
    Service.validatePricing(props.pricing);

    const service = new Service(
      ServiceId.generate(props.idGen),
      props.name,
      props.description,
      props.categoryId,
      props.durationMinutes,
      props.pricing,
      [...props.materialNorms],
      true,
      props.displayOrder,
      1,
    );

    service.addEvent(new ServiceCreated(service.id, service._name, props.now));

    return service;
  }

  static restore(snapshot: ServiceSnapshot): Service {
    return new Service(
      ServiceId.from(snapshot.id),
      snapshot.name,
      snapshot.description,
      snapshot.categoryId as ServiceCategoryId,
      snapshot.durationMinutes,
      Service.restorePricing(snapshot.pricing),
      Service.restoreNorms(snapshot.materialNorms),
      snapshot.isActive,
      snapshot.displayOrder,
      snapshot.version,
    );
  }

  rename(newName: string): void {
    this.ensureActive();
    this._name = newName;
    this._version += 1;
  }

  setDescription(newDescription: string): void {
    this.ensureActive();
    this._description = newDescription;
    this._version += 1;
  }

  changePrice(newPricing: ServicePricing, now: DateTime): void {
    this.ensureActive();
    Service.validatePricing(newPricing);

    this._pricing = newPricing;
    this._version += 1;
    this.addEvent(new ServicePriceChanged(this.id, newPricing, now));
  }

  setDuration(durationMinutes: number): void {
    this.ensureActive();
    Service.validateDuration(durationMinutes);

    this._durationMinutes = durationMinutes;
    this._version += 1;
  }

  setNorms(norms: readonly MaterialNorm[], now: DateTime): void {
    this.ensureActive();

    this._materialNorms = [...norms];
    this._version += 1;
    this.addEvent(new ServiceMaterialNormsChanged(this.id, this._materialNorms, now));
  }

  deactivate(now: DateTime): void {
    if (!this._isActive) {
      throw new ServiceAlreadyDeactivatedError(this.id);
    }

    this._isActive = false;
    this._version += 1;
    this.addEvent(new ServiceDeactivated(this.id, now));
  }

  calculatePrice(bodyType: BodyType): Money {
    if (this._pricing.type === PricingType.FIXED) {
      return this._pricing.price;
    }

    const price = this._pricing.prices.get(bodyType);

    if (price === undefined) {
      throw new InvalidPricingError(`No price defined for body type ${bodyType}`);
    }

    return price;
  }

  toSnapshot(): ServiceSnapshot {
    return {
      categoryId: this._categoryId,
      description: this._description,
      displayOrder: this._displayOrder,
      durationMinutes: this._durationMinutes,
      id: this.id,
      isActive: this._isActive,
      materialNorms: this._materialNorms.map((n) => Service.normToSnapshot(n)),
      name: this._name,
      pricing: Service.pricingToSnapshot(this._pricing),
      version: this._version,
    };
  }

  private ensureActive(): void {
    if (!this._isActive) {
      throw new ServiceAlreadyDeactivatedError(this.id);
    }
  }

  private static validateDuration(minutes: number): void {
    if (minutes <= 0 || minutes % 15 !== 0) {
      throw new InvalidDurationError(minutes);
    }
  }

  private static validatePricing(pricing: ServicePricing): void {
    if (pricing.type === PricingType.BY_BODY_TYPE && pricing.prices.size === 0) {
      throw new InvalidPricingError('BY_BODY_TYPE pricing must have at least one price');
    }
  }

  private static pricingToSnapshot(pricing: ServicePricing): ServicePricingSnapshot {
    if (pricing.type === PricingType.FIXED) {
      return { fixedPriceCents: pricing.price.cents.toString(), type: PricingType.FIXED };
    }

    return {
      bodyTypePrices: [...pricing.prices.entries()].map(([bt, price]) => ({
        bodyType: bt,
        priceCents: price.cents.toString(),
      })),
      type: PricingType.BY_BODY_TYPE,
    };
  }

  private static normToSnapshot(norm: MaterialNorm): MaterialNormSnapshot {
    const snapshot: {
      skuId: string;
      amount: number;
      unit: string;
      bodyTypeCoefficients?: Array<{ bodyType: string; coefficient: number }>;
    } = {
      amount: norm.amount,
      skuId: norm.skuId,
      unit: norm.unit,
    };

    if (norm.bodyTypeCoefficients && norm.bodyTypeCoefficients.size > 0) {
      snapshot.bodyTypeCoefficients = [...norm.bodyTypeCoefficients.entries()].map(
        ([bt, coeff]) => ({
          bodyType: bt,
          coefficient: coeff,
        }),
      );
    }

    return snapshot;
  }

  private static restorePricing(snapshot: ServicePricingSnapshot): ServicePricing {
    if (snapshot.type === PricingType.FIXED) {
      return {
        price: Money.rub(Number(snapshot.fixedPriceCents) / 100),
        type: PricingType.FIXED,
      };
    }

    const prices = new Map<BodyType, Money>();

    for (const entry of snapshot.bodyTypePrices ?? []) {
      prices.set(entry.bodyType as BodyType, Money.rub(Number(entry.priceCents) / 100));
    }

    return { prices, type: PricingType.BY_BODY_TYPE };
  }

  private static restoreNorms(snapshots: readonly MaterialNormSnapshot[]): MaterialNorm[] {
    return snapshots.map((s) => {
      const norm: {
        skuId: string;
        amount: number;
        unit: string;
        bodyTypeCoefficients?: Map<BodyType, number>;
      } = {
        amount: s.amount,
        skuId: s.skuId,
        unit: s.unit,
      };

      if (s.bodyTypeCoefficients && s.bodyTypeCoefficients.length > 0) {
        norm.bodyTypeCoefficients = new Map(
          s.bodyTypeCoefficients.map((c) => [c.bodyType as BodyType, c.coefficient]),
        );
      }

      return norm as MaterialNorm;
    });
  }
}
