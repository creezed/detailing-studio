import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, IIdGenerator } from '@det/backend-shared-ddd';

import { ServiceCategoryId } from './service-category-id';
import {
  InvalidServiceCategoryIconError,
  InvalidServiceCategoryNameError,
  ServiceCategoryAlreadyDeactivatedError,
} from './service-category.errors';
import { ServiceCategoryCreated, ServiceCategoryDeactivated } from './service-category.events';

export interface CreateServiceCategoryProps {
  readonly name: string;
  readonly icon: string;
  readonly displayOrder: number;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface ServiceCategorySnapshot {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

export class ServiceCategory extends AggregateRoot<ServiceCategoryId> {
  private constructor(
    private readonly _id: ServiceCategoryId,
    private _name: string,
    private _icon: string,
    private _displayOrder: number,
    private _isActive: boolean,
  ) {
    super();
  }

  override get id(): ServiceCategoryId {
    return this._id;
  }

  static create(props: CreateServiceCategoryProps): ServiceCategory {
    if (!props.name.trim()) {
      throw new InvalidServiceCategoryNameError();
    }

    if (!props.icon.trim()) {
      throw new InvalidServiceCategoryIconError();
    }

    const category = new ServiceCategory(
      ServiceCategoryId.generate(props.idGen),
      props.name,
      props.icon,
      props.displayOrder,
      true,
    );

    category.addEvent(new ServiceCategoryCreated(category.id, category._name, props.now));

    return category;
  }

  static restore(snapshot: ServiceCategorySnapshot): ServiceCategory {
    return new ServiceCategory(
      ServiceCategoryId.from(snapshot.id),
      snapshot.name,
      snapshot.icon,
      snapshot.displayOrder,
      snapshot.isActive,
    );
  }

  rename(newName: string): void {
    this.ensureActive();

    if (!newName.trim()) {
      throw new InvalidServiceCategoryNameError();
    }

    this._name = newName;
  }

  changeIcon(newIcon: string): void {
    this.ensureActive();

    if (!newIcon.trim()) {
      throw new InvalidServiceCategoryIconError();
    }

    this._icon = newIcon;
  }

  changeDisplayOrder(newOrder: number): void {
    this.ensureActive();
    this._displayOrder = newOrder;
  }

  deactivate(now: DateTime): void {
    if (!this._isActive) {
      throw new ServiceCategoryAlreadyDeactivatedError(this.id);
    }

    this._isActive = false;
    this.addEvent(new ServiceCategoryDeactivated(this.id, now));
  }

  toSnapshot(): ServiceCategorySnapshot {
    return {
      displayOrder: this._displayOrder,
      icon: this._icon,
      id: this.id,
      isActive: this._isActive,
      name: this._name,
    };
  }

  private ensureActive(): void {
    if (!this._isActive) {
      throw new ServiceCategoryAlreadyDeactivatedError(this.id);
    }
  }
}
