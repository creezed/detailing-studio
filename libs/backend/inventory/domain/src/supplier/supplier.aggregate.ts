import { AggregateRoot } from '@det/backend-shared-ddd';
import type { DateTime, IIdGenerator } from '@det/backend-shared-ddd';

import { SupplierId } from './supplier-id';
import { SupplierAlreadyActiveError, SupplierAlreadyDeactivatedError } from './supplier.errors';
import {
  SupplierContactUpdated,
  SupplierCreated,
  SupplierDeactivated,
  SupplierReactivated,
} from './supplier.events';
import { ContactInfo } from '../value-objects/contact-info.value-object';
import { Inn } from '../value-objects/inn.value-object';
import { SupplierName } from '../value-objects/supplier-name.value-object';

import type { ContactInfoProps } from '../value-objects/contact-info.value-object';

export interface CreateSupplierProps {
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
  readonly name: string;
  readonly inn?: Inn | null;
  readonly contact?: ContactInfoProps;
}

export interface SupplierSnapshot {
  readonly id: string;
  readonly name: string;
  readonly inn: string | null;
  readonly contact: ContactInfoProps;
  readonly isActive: boolean;
}

export class Supplier extends AggregateRoot<SupplierId> {
  private constructor(
    private readonly _id: SupplierId,
    private readonly _name: SupplierName,
    private readonly _inn: Inn | null,
    private _contact: ContactInfo,
    private _isActive: boolean,
  ) {
    super();
  }

  override get id(): SupplierId {
    return this._id;
  }

  static create(props: CreateSupplierProps): Supplier {
    const supplier = new Supplier(
      SupplierId.generate(props.idGen),
      SupplierName.from(props.name),
      props.inn ?? null,
      props.contact ? ContactInfo.create(props.contact) : ContactInfo.empty(),
      true,
    );

    supplier.addEvent(new SupplierCreated(supplier.id, supplier._name.getValue(), props.now));

    return supplier;
  }

  static restore(snapshot: SupplierSnapshot): Supplier {
    return new Supplier(
      SupplierId.from(snapshot.id),
      SupplierName.from(snapshot.name),
      snapshot.inn !== null ? Inn.from(snapshot.inn) : null,
      ContactInfo.create(snapshot.contact),
      snapshot.isActive,
    );
  }

  updateContact(contact: ContactInfoProps, now: DateTime): void {
    this._contact = ContactInfo.create(contact);
    this.addEvent(new SupplierContactUpdated(this.id, now));
  }

  deactivate(now: DateTime): void {
    if (!this._isActive) {
      throw new SupplierAlreadyDeactivatedError(this.id);
    }

    this._isActive = false;
    this.addEvent(new SupplierDeactivated(this.id, now));
  }

  reactivate(now: DateTime): void {
    if (this._isActive) {
      throw new SupplierAlreadyActiveError(this.id);
    }

    this._isActive = true;
    this.addEvent(new SupplierReactivated(this.id, now));
  }

  toSnapshot(): SupplierSnapshot {
    return {
      contact: {
        address: this._contact.address,
        email: this._contact.email,
        phone: this._contact.phone,
      },
      id: this.id,
      inn: this._inn?.getValue() ?? null,
      isActive: this._isActive,
      name: this._name.getValue(),
    };
  }
}
