import { AggregateRoot, DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import { ClientId } from './client-id';
import {
  CannotRevokePersonalDataConsentError,
  ClientAlreadyRegularError,
  ClientAnonymizedError,
  MissingMandatoryConsentError,
  VehicleNotFoundError,
} from './client.errors';
import {
  ClientAnonymized,
  ClientConsentGiven,
  ClientConsentRevoked,
  ClientProfileUpdated,
  ClientRegistered,
  ClientUpgradedToRegular,
  ClientVehicleAdded,
  ClientVehicleDeactivated,
  ClientVehicleUpdated,
} from './client.events';
import { VehicleId } from './vehicle-id';
import { Vehicle } from './vehicle.entity';
import { ClientStatus } from '../value-objects/client-status';
import { ClientType } from '../value-objects/client-type';
import { ConsentSet } from '../value-objects/consent-set';
import { ConsentType } from '../value-objects/consent-type';
import { Email } from '../value-objects/email.value-object';
import { FullName } from '../value-objects/full-name.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';

import type { CreateVehicleProps, UpdateVehicleProps, VehicleSnapshot } from './vehicle.entity';
import type { BodyType } from '../value-objects/body-type';
import type { ClientSource } from '../value-objects/client-source';
import type { ConsentRecord } from '../value-objects/consent-set';
import type { LicensePlate } from '../value-objects/license-plate.value-object';
import type { PolicyVersion } from '../value-objects/policy-version';
import type { Vin } from '../value-objects/vin.value-object';

export interface RegisterClientProps {
  readonly fullName: FullName;
  readonly phone: PhoneNumber;
  readonly email: Email | null;
  readonly birthDate: Date | null;
  readonly source: ClientSource | null;
  readonly comment: string;
  readonly consents: ConsentSet;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface UpdateProfileProps {
  readonly fullName?: FullName;
  readonly phone?: PhoneNumber;
  readonly email?: Email | null;
  readonly birthDate?: Date | null;
  readonly source?: ClientSource | null;
  readonly comment?: string;
}

export interface AddVehicleProps {
  readonly make: string;
  readonly model: string;
  readonly bodyType: BodyType;
  readonly licensePlate: LicensePlate | null;
  readonly vin: Vin | null;
  readonly year: number | null;
  readonly color: string | null;
  readonly comment: string;
  readonly idGen: IIdGenerator;
}

export interface ClientSnapshot {
  readonly id: string;
  readonly fullName: { last: string; first: string; middle: string | null };
  readonly phone: string;
  readonly email: string | null;
  readonly birthDate: string | null;
  readonly source: ClientSource | null;
  readonly consents: readonly ConsentRecord[];
  readonly type: ClientType;
  readonly comment: string;
  readonly vehicles: readonly VehicleSnapshot[];
  readonly status: ClientStatus;
  readonly createdAt: string;
  readonly anonymizedAt: string | null;
}

export class Client extends AggregateRoot<ClientId> {
  private constructor(
    private readonly _id: ClientId,
    private _fullName: FullName,
    private _phone: PhoneNumber,
    private _email: Email | null,
    private _birthDate: Date | null,
    private _source: ClientSource | null,
    private _consents: ConsentSet,
    private _type: ClientType,
    private _comment: string,
    private readonly _vehicles: Vehicle[],
    private _status: ClientStatus,
    private readonly _createdAt: DateTime,
    private _anonymizedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): ClientId {
    return this._id;
  }

  static registerRegular(props: RegisterClientProps): Client {
    if (!props.consents.has(ConsentType.PERSONAL_DATA_PROCESSING)) {
      throw new MissingMandatoryConsentError();
    }

    const client = new Client(
      ClientId.generate(props.idGen),
      props.fullName,
      props.phone,
      props.email,
      props.birthDate,
      props.source,
      props.consents,
      ClientType.REGULAR,
      props.comment,
      [],
      ClientStatus.ACTIVE,
      props.now,
      null,
    );

    client.addEvent(new ClientRegistered(client._id, ClientType.REGULAR, props.now));

    return client;
  }

  static registerGuest(props: RegisterClientProps): Client {
    if (!props.consents.has(ConsentType.PERSONAL_DATA_PROCESSING)) {
      throw new MissingMandatoryConsentError();
    }

    const client = new Client(
      ClientId.generate(props.idGen),
      props.fullName,
      props.phone,
      props.email,
      props.birthDate,
      props.source,
      props.consents,
      ClientType.GUEST,
      props.comment,
      [],
      ClientStatus.ACTIVE,
      props.now,
      null,
    );

    client.addEvent(new ClientRegistered(client._id, ClientType.GUEST, props.now));

    return client;
  }

  static restore(snapshot: ClientSnapshot, vehicles: Vehicle[]): Client {
    return new Client(
      ClientId.from(snapshot.id),
      FullName.create(snapshot.fullName.last, snapshot.fullName.first, snapshot.fullName.middle),
      PhoneNumber.from(snapshot.phone),
      snapshot.email !== null ? Email.from(snapshot.email) : null,
      snapshot.birthDate !== null ? new Date(snapshot.birthDate) : null,
      snapshot.source,
      ConsentSet.from(snapshot.consents),
      snapshot.type,
      snapshot.comment,
      vehicles,
      snapshot.status,
      DateTime.from(snapshot.createdAt),
      snapshot.anonymizedAt !== null ? DateTime.from(snapshot.anonymizedAt) : null,
    );
  }

  upgradeToRegular(at: DateTime): void {
    this.ensureNotAnonymized();

    if (this._type === ClientType.REGULAR) {
      throw new ClientAlreadyRegularError(this._id);
    }

    this._type = ClientType.REGULAR;
    this.addEvent(new ClientUpgradedToRegular(this._id, at));
  }

  updateProfile(props: UpdateProfileProps, at: DateTime): void {
    this.ensureNotAnonymized();

    if (props.fullName !== undefined) this._fullName = props.fullName;
    if (props.phone !== undefined) this._phone = props.phone;
    if (props.email !== undefined) this._email = props.email;
    if (props.birthDate !== undefined) this._birthDate = props.birthDate;
    if (props.source !== undefined) this._source = props.source;
    if (props.comment !== undefined) this._comment = props.comment;

    this.addEvent(new ClientProfileUpdated(this._id, at));
  }

  giveConsent(type: ConsentType, at: DateTime, policyVersion: PolicyVersion): void {
    this.ensureNotAnonymized();

    const prev = this._consents;
    this._consents = this._consents.give(type, at.toDate(), policyVersion);

    if (this._consents !== prev) {
      this.addEvent(new ClientConsentGiven(this._id, type, policyVersion, at));
    }
  }

  revokeConsent(type: ConsentType, at: DateTime): void {
    this.ensureNotAnonymized();

    if (type === ConsentType.PERSONAL_DATA_PROCESSING) {
      throw new CannotRevokePersonalDataConsentError();
    }

    this._consents = this._consents.revoke(type, at.toDate());
    this.addEvent(new ClientConsentRevoked(this._id, type, at));
  }

  addVehicle(props: AddVehicleProps, at: DateTime): VehicleId {
    this.ensureNotAnonymized();

    const vehicleId = VehicleId.generate(props.idGen);

    const vehicleProps: CreateVehicleProps = {
      id: vehicleId,
      make: props.make,
      model: props.model,
      bodyType: props.bodyType,
      licensePlate: props.licensePlate,
      vin: props.vin,
      year: props.year,
      color: props.color,
      comment: props.comment,
    };

    this._vehicles.push(Vehicle.create(vehicleProps));
    this.addEvent(new ClientVehicleAdded(this._id, vehicleId, at));

    return vehicleId;
  }

  updateVehicle(vehicleId: VehicleId, props: UpdateVehicleProps, at: DateTime): void {
    this.ensureNotAnonymized();

    const vehicle = this.findVehicle(vehicleId);
    vehicle.update(props);
    this.addEvent(new ClientVehicleUpdated(this._id, vehicleId, at));
  }

  deactivateVehicle(vehicleId: VehicleId, at: DateTime): void {
    this.ensureNotAnonymized();

    const vehicle = this.findVehicle(vehicleId);
    vehicle.deactivate();
    this.addEvent(new ClientVehicleDeactivated(this._id, vehicleId, at));
  }

  anonymize(by: UserId, reason: string, at: DateTime): void {
    if (this._status === ClientStatus.ANONYMIZED) {
      return;
    }

    const shortId = this._id.substring(0, 8);

    this._fullName = FullName.anonymized(shortId);
    this._phone = PhoneNumber.from('+70000000000');
    this._email = null;
    this._birthDate = null;
    this._comment = '';

    for (const vehicle of this._vehicles) {
      if (vehicle.isActive) {
        vehicle.deactivate();
      }
    }

    this._status = ClientStatus.ANONYMIZED;
    this._anonymizedAt = at;

    this.addEvent(new ClientAnonymized(this._id, by, reason, at));
  }

  toSnapshot(): ClientSnapshot {
    return {
      id: this._id,
      fullName: {
        last: this._fullName.last,
        first: this._fullName.first,
        middle: this._fullName.middle,
      },
      phone: this._phone.toString(),
      email: this._email?.toString() ?? null,
      birthDate: this._birthDate?.toISOString() ?? null,
      source: this._source,
      consents: this._consents.toArray(),
      type: this._type,
      comment: this._comment,
      vehicles: this._vehicles.map((v) => v.toSnapshot()),
      status: this._status,
      createdAt: this._createdAt.iso(),
      anonymizedAt: this._anonymizedAt?.iso() ?? null,
    };
  }

  private ensureNotAnonymized(): void {
    if (this._status === ClientStatus.ANONYMIZED) {
      throw new ClientAnonymizedError(this._id);
    }
  }

  private findVehicle(vehicleId: VehicleId): Vehicle {
    const vehicle = this._vehicles.find((v) => v.equals({ id: vehicleId } as Vehicle));

    if (!vehicle) {
      throw new VehicleNotFoundError(vehicleId);
    }

    return vehicle;
  }
}
