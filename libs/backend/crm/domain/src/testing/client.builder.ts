import type { IIdGenerator } from '@det/backend-shared-ddd';
import { DateTime } from '@det/backend-shared-ddd';

import { FixedIdGenerator } from './fixed-id-generator';
import { Client } from '../client/client.aggregate';
import { BodyType } from '../value-objects/body-type';
import { ConsentSet } from '../value-objects/consent-set';
import { ConsentType } from '../value-objects/consent-type';
import { Email } from '../value-objects/email.value-object';
import { FullName } from '../value-objects/full-name.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';
import { PolicyVersion } from '../value-objects/policy-version';

import type { RegisterClientProps } from '../client/client.aggregate';

const DEFAULT_CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const DEFAULT_NOW = DateTime.from('2026-01-15T10:00:00.000Z');
const DEFAULT_POLICY = PolicyVersion.from('1.0.0');

export class ClientBuilder {
  private _id: string = DEFAULT_CLIENT_ID;
  private _fullName: FullName = FullName.create('Иванов', 'Иван', 'Иванович');
  private _phone: PhoneNumber = PhoneNumber.from('+79990001111');
  private _email: Email | null = Email.from('ivan@example.com');
  private _birthDate: Date | null = null;
  private readonly _source: RegisterClientProps['source'] = null;
  private readonly _comment = '';
  private _consents: ConsentSet = ConsentSet.empty().give(
    ConsentType.PERSONAL_DATA_PROCESSING,
    DEFAULT_NOW.toDate(),
    DEFAULT_POLICY,
  );
  private _now: DateTime = DEFAULT_NOW;
  private _asGuest = false;

  withId(id: string): this {
    this._id = id;
    return this;
  }

  withFullName(last: string, first: string, middle?: string | null): this {
    this._fullName = FullName.create(last, first, middle);
    return this;
  }

  withPhone(phone: string): this {
    this._phone = PhoneNumber.from(phone);
    return this;
  }

  withEmail(email: string | null): this {
    this._email = email !== null ? Email.from(email) : null;
    return this;
  }

  withBirthDate(date: Date | null): this {
    this._birthDate = date;
    return this;
  }

  withConsents(consents: ConsentSet): this {
    this._consents = consents;
    return this;
  }

  withoutConsents(): this {
    this._consents = ConsentSet.empty();
    return this;
  }

  withNow(now: DateTime): this {
    this._now = now;
    return this;
  }

  asGuest(): this {
    this._asGuest = true;
    return this;
  }

  build(): Client {
    const idGen: IIdGenerator = new FixedIdGenerator([this._id]);

    const props: RegisterClientProps = {
      fullName: this._fullName,
      phone: this._phone,
      email: this._email,
      birthDate: this._birthDate,
      source: this._source,
      comment: this._comment,
      consents: this._consents,
      idGen,
      now: this._now,
    };

    if (this._asGuest) {
      return Client.registerGuest(props);
    }

    return Client.registerRegular(props);
  }

  buildWithVehicle(): { client: Client; vehicleId: string } {
    const vehicleIdStr = '22222222-2222-4222-8222-222222222222';
    const client = this.build();
    const vehicleIdGen = new FixedIdGenerator([vehicleIdStr]);

    const vehicleId = client.addVehicle(
      {
        make: 'Toyota',
        model: 'Camry',
        bodyType: BodyType.SEDAN,
        licensePlate: null,
        vin: null,
        year: 2023,
        color: null,
        comment: '',
        idGen: vehicleIdGen,
      },
      this._now,
    );

    return { client, vehicleId: vehicleId };
  }
}
