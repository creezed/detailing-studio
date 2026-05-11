import { AggregateRoot, DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import {
  BranchAlreadyActiveError,
  BranchAlreadyDeactivatedError,
  BranchInUseError,
} from './branch.errors';
import {
  BranchAddressUpdated,
  BranchCreated,
  BranchDeactivated,
  BranchReactivated,
  BranchRenamed,
  BranchTimezoneChanged,
} from './branch.events';
import { Address } from '../value-objects/address.value-object';
import { BranchId } from '../value-objects/branch-id';
import { BranchName } from '../value-objects/branch-name.value-object';
import { Timezone } from '../value-objects/timezone.value-object';

export interface CreateBranchProps {
  readonly name: string;
  readonly address: string;
  readonly timezone: string;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface BranchSnapshot {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly timezone: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}

export class Branch extends AggregateRoot<BranchId> {
  private constructor(
    private readonly _id: BranchId,
    private _name: BranchName,
    private _address: Address,
    private _timezone: Timezone,
    private _isActive: boolean,
    private readonly _createdAt: DateTime,
  ) {
    super();
  }

  override get id(): BranchId {
    return this._id;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  static create(props: CreateBranchProps): Branch {
    const branch = new Branch(
      BranchId.generate(props.idGen),
      BranchName.from(props.name),
      Address.from(props.address),
      Timezone.from(props.timezone),
      true,
      props.now,
    );

    branch.addEvent(new BranchCreated(branch.id, props.name, props.timezone, props.now));

    return branch;
  }

  static restore(snapshot: BranchSnapshot): Branch {
    return new Branch(
      BranchId.from(snapshot.id),
      BranchName.from(snapshot.name),
      Address.from(snapshot.address),
      Timezone.from(snapshot.timezone),
      snapshot.isActive,
      DateTime.from(snapshot.createdAt),
    );
  }

  rename(name: string, now: DateTime): void {
    this._name = BranchName.from(name);
    this.addEvent(new BranchRenamed(this.id, name, now));
  }

  updateAddress(address: string, now: DateTime): void {
    this._address = Address.from(address);
    this.addEvent(new BranchAddressUpdated(this.id, address, now));
  }

  changeTimezone(timezone: string, now: DateTime): void {
    if (this._isActive) {
      throw new BranchInUseError(this.id);
    }
    this._timezone = Timezone.from(timezone);
    this.addEvent(new BranchTimezoneChanged(this.id, timezone, now));
  }

  deactivate(now: DateTime): void {
    if (!this._isActive) {
      throw new BranchAlreadyDeactivatedError(this.id);
    }
    this._isActive = false;
    this.addEvent(new BranchDeactivated(this.id, now));
  }

  reactivate(now: DateTime): void {
    if (this._isActive) {
      throw new BranchAlreadyActiveError(this.id);
    }
    this._isActive = true;
    this.addEvent(new BranchReactivated(this.id, now));
  }

  toSnapshot(): BranchSnapshot {
    return {
      id: this.id,
      name: this._name.getValue(),
      address: this._address.getValue(),
      timezone: this._timezone.getValue(),
      isActive: this._isActive,
      createdAt: this._createdAt.iso(),
    };
  }
}
