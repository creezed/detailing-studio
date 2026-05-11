import { AggregateRoot } from '@det/backend-shared-ddd';
import type { IIdGenerator, DateTime } from '@det/backend-shared-ddd';

import { BayAlreadyActiveError, BayAlreadyDeactivatedError } from './bay.errors';
import { BayCreated, BayDeactivated, BayReactivated, BayRenamed } from './bay.events';
import { BayId } from '../value-objects/bay-id';
import { BranchId } from '../value-objects/branch-id';
import { BranchName } from '../value-objects/branch-name.value-object';

export interface CreateBayProps {
  readonly branchId: string;
  readonly name: string;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface BaySnapshot {
  readonly id: string;
  readonly branchId: string;
  readonly name: string;
  readonly isActive: boolean;
}

export class Bay extends AggregateRoot<BayId> {
  private constructor(
    private readonly _id: BayId,
    private readonly _branchId: BranchId,
    private _name: BranchName,
    private _isActive: boolean,
  ) {
    super();
  }

  override get id(): BayId {
    return this._id;
  }

  get branchId(): BranchId {
    return this._branchId;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  static create(props: CreateBayProps): Bay {
    const bay = new Bay(
      BayId.generate(props.idGen),
      BranchId.from(props.branchId),
      BranchName.from(props.name),
      true,
    );

    bay.addEvent(new BayCreated(bay.id, bay._branchId, props.name, props.now));

    return bay;
  }

  static restore(snapshot: BaySnapshot): Bay {
    return new Bay(
      BayId.from(snapshot.id),
      BranchId.from(snapshot.branchId),
      BranchName.from(snapshot.name),
      snapshot.isActive,
    );
  }

  rename(name: string, now: DateTime): void {
    this._name = BranchName.from(name);
    this.addEvent(new BayRenamed(this.id, name, now));
  }

  deactivate(now: DateTime): void {
    if (!this._isActive) {
      throw new BayAlreadyDeactivatedError(this.id);
    }
    this._isActive = false;
    this.addEvent(new BayDeactivated(this.id, now));
  }

  reactivate(now: DateTime): void {
    if (this._isActive) {
      throw new BayAlreadyActiveError(this.id);
    }
    this._isActive = true;
    this.addEvent(new BayReactivated(this.id, now));
  }

  toSnapshot(): BaySnapshot {
    return {
      id: this.id,
      branchId: this._branchId,
      name: this._name.getValue(),
      isActive: this._isActive,
    };
  }
}
