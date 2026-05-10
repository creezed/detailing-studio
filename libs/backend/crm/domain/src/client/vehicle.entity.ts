import { Entity } from '@det/backend-shared-ddd';

import { VehicleAlreadyDeactivatedError } from './client.errors';

import type { VehicleId } from './vehicle-id';
import type { BodyType } from '../value-objects/body-type';
import type { LicensePlate } from '../value-objects/license-plate.value-object';
import type { Vin } from '../value-objects/vin.value-object';

export interface CreateVehicleProps {
  readonly id: VehicleId;
  readonly make: string;
  readonly model: string;
  readonly bodyType: BodyType;
  readonly licensePlate: LicensePlate | null;
  readonly vin: Vin | null;
  readonly year: number | null;
  readonly color: string | null;
  readonly comment: string;
}

export interface UpdateVehicleProps {
  readonly make?: string;
  readonly model?: string;
  readonly bodyType?: BodyType;
  readonly licensePlate?: LicensePlate | null;
  readonly vin?: Vin | null;
  readonly year?: number | null;
  readonly color?: string | null;
  readonly comment?: string;
}

export interface VehicleSnapshot {
  readonly id: string;
  readonly make: string;
  readonly model: string;
  readonly bodyType: BodyType;
  readonly licensePlate: string | null;
  readonly vin: string | null;
  readonly year: number | null;
  readonly color: string | null;
  readonly comment: string;
  readonly isActive: boolean;
}

export class Vehicle extends Entity<VehicleId> {
  private constructor(
    private readonly _id: VehicleId,
    private _make: string,
    private _model: string,
    private _bodyType: BodyType,
    private _licensePlate: LicensePlate | null,
    private _vin: Vin | null,
    private _year: number | null,
    private _color: string | null,
    private _comment: string,
    private _isActive: boolean,
  ) {
    super();
  }

  override get id(): VehicleId {
    return this._id;
  }

  get vin(): Vin | null {
    return this._vin;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  static create(props: CreateVehicleProps): Vehicle {
    return new Vehicle(
      props.id,
      props.make,
      props.model,
      props.bodyType,
      props.licensePlate,
      props.vin,
      props.year,
      props.color,
      props.comment,
      true,
    );
  }

  static restore(
    snapshot: VehicleSnapshot,
    licensePlate: LicensePlate | null,
    vin: Vin | null,
  ): Vehicle {
    return new Vehicle(
      snapshot.id as VehicleId,
      snapshot.make,
      snapshot.model,
      snapshot.bodyType,
      licensePlate,
      vin,
      snapshot.year,
      snapshot.color,
      snapshot.comment,
      snapshot.isActive,
    );
  }

  update(props: UpdateVehicleProps): void {
    if (props.make !== undefined) this._make = props.make;
    if (props.model !== undefined) this._model = props.model;
    if (props.bodyType !== undefined) this._bodyType = props.bodyType;
    if (props.licensePlate !== undefined) this._licensePlate = props.licensePlate;
    if (props.vin !== undefined) this._vin = props.vin;
    if (props.year !== undefined) this._year = props.year;
    if (props.color !== undefined) this._color = props.color;
    if (props.comment !== undefined) this._comment = props.comment;
  }

  deactivate(): void {
    if (!this._isActive) {
      throw new VehicleAlreadyDeactivatedError(this._id);
    }

    this._isActive = false;
  }

  reactivate(): void {
    this._isActive = true;
  }

  toSnapshot(): VehicleSnapshot {
    return {
      id: this._id,
      make: this._make,
      model: this._model,
      bodyType: this._bodyType,
      licensePlate: this._licensePlate?.value ?? null,
      vin: this._vin?.value ?? null,
      year: this._year,
      color: this._color,
      comment: this._comment,
      isActive: this._isActive,
    };
  }
}
