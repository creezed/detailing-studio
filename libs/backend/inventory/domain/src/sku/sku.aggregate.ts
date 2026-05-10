import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, IIdGenerator, UnitOfMeasure } from '@det/backend-shared-ddd';

import { SkuId } from './sku-id';
import { SkuAlreadyActiveError, SkuAlreadyDeactivatedError } from './sku.errors';
import {
  SkuBarcodeAssigned,
  SkuBarcodeRemoved,
  SkuCreated,
  SkuDeactivated,
  SkuGroupChanged,
  SkuPackagingsUpdated,
  SkuReactivated,
  SkuRenamed,
} from './sku.events';
import { ArticleNumber } from '../value-objects/article-number.value-object';
import { Barcode } from '../value-objects/barcode.value-object';
import { InvalidPackagingError, Packaging } from '../value-objects/packaging.value-object';
import { SkuGroup } from '../value-objects/sku-group.value-object';
import { SkuName } from '../value-objects/sku-name.value-object';

export interface CreateSkuProps {
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
  readonly articleNumber: string;
  readonly name: string;
  readonly group: string;
  readonly baseUnit: UnitOfMeasure;
  readonly packagings?: readonly Packaging[];
  readonly barcode?: Barcode | null;
  readonly hasExpiry: boolean;
  readonly photoUrl?: string | null;
  readonly description?: string;
}

export interface SkuSnapshot {
  readonly id: string;
  readonly articleNumber: string;
  readonly name: string;
  readonly group: string;
  readonly baseUnit: UnitOfMeasure;
  readonly packagings: readonly {
    readonly id: string;
    readonly name: string;
    readonly coefficient: number;
  }[];
  readonly barcode: string | null;
  readonly hasExpiry: boolean;
  readonly photoUrl: string | null;
  readonly isActive: boolean;
  readonly description: string;
}

export class Sku extends AggregateRoot<SkuId> {
  private constructor(
    private readonly _id: SkuId,
    private readonly _articleNumber: ArticleNumber,
    private _name: SkuName,
    private _group: SkuGroup,
    private readonly _baseUnit: UnitOfMeasure,
    private _packagings: Packaging[],
    private _barcode: Barcode | null,
    private readonly _hasExpiry: boolean,
    private readonly _photoUrl: string | null,
    private _isActive: boolean,
    private readonly _description: string,
  ) {
    super();
  }

  override get id(): SkuId {
    return this._id;
  }

  static create(props: CreateSkuProps): Sku {
    const packagings = props.packagings ? [...props.packagings] : [];

    Sku.validatePackagings(packagings);

    const sku = new Sku(
      SkuId.generate(props.idGen),
      ArticleNumber.from(props.articleNumber),
      SkuName.from(props.name),
      SkuGroup.from(props.group),
      props.baseUnit,
      packagings,
      props.barcode ?? null,
      props.hasExpiry,
      props.photoUrl ?? null,
      true,
      props.description ?? '',
    );

    sku.addEvent(new SkuCreated(sku.id, sku._articleNumber.getValue(), props.now));

    return sku;
  }

  static restore(snapshot: SkuSnapshot): Sku {
    return new Sku(
      SkuId.from(snapshot.id),
      ArticleNumber.from(snapshot.articleNumber),
      SkuName.from(snapshot.name),
      SkuGroup.from(snapshot.group),
      snapshot.baseUnit,
      snapshot.packagings.map((p) => Packaging.create(p.id, p.name, p.coefficient)),
      snapshot.barcode !== null ? Barcode.from(snapshot.barcode) : null,
      snapshot.hasExpiry,
      snapshot.photoUrl,
      snapshot.isActive,
      snapshot.description,
    );
  }

  rename(name: string, now: DateTime): void {
    this._name = SkuName.from(name);
    this.addEvent(new SkuRenamed(this.id, this._name.getValue(), now));
  }

  changeGroup(group: string, now: DateTime): void {
    this._group = SkuGroup.from(group);
    this.addEvent(new SkuGroupChanged(this.id, this._group.getValue(), now));
  }

  updatePackagings(packagings: readonly Packaging[], now: DateTime): void {
    Sku.validatePackagings(packagings);

    this._packagings = [...packagings];
    this.addEvent(new SkuPackagingsUpdated(this.id, now));
  }

  assignBarcode(barcode: Barcode, now: DateTime): void {
    this._barcode = barcode;
    this.addEvent(new SkuBarcodeAssigned(this.id, barcode.getValue(), now));
  }

  removeBarcode(now: DateTime): void {
    this._barcode = null;
    this.addEvent(new SkuBarcodeRemoved(this.id, now));
  }

  deactivate(now: DateTime): void {
    if (!this._isActive) {
      throw new SkuAlreadyDeactivatedError(this.id);
    }

    this._isActive = false;
    this.addEvent(new SkuDeactivated(this.id, now));
  }

  reactivate(now: DateTime): void {
    if (this._isActive) {
      throw new SkuAlreadyActiveError(this.id);
    }

    this._isActive = true;
    this.addEvent(new SkuReactivated(this.id, now));
  }

  toSnapshot(): SkuSnapshot {
    return {
      articleNumber: this._articleNumber.getValue(),
      barcode: this._barcode?.getValue() ?? null,
      baseUnit: this._baseUnit,
      description: this._description,
      group: this._group.getValue(),
      hasExpiry: this._hasExpiry,
      id: this.id,
      isActive: this._isActive,
      name: this._name.getValue(),
      packagings: this._packagings.map((p) => ({
        id: p.id,
        name: p.name,
        coefficient: p.coefficient,
      })),
      photoUrl: this._photoUrl,
    };
  }

  private static validatePackagings(packagings: readonly Packaging[]): void {
    const ids = new Set<string>();

    for (const p of packagings) {
      if (ids.has(p.id)) {
        throw new InvalidPackagingError(`duplicate packaging id: ${p.id}`);
      }

      ids.add(p.id);
    }
  }
}
