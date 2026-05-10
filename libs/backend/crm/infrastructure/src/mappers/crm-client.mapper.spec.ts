import {
  BodyType,
  Client,
  ClientStatus,
  ClientType,
  ConsentSet,
  ConsentType,
  Email,
  FullName,
  LicensePlate,
  PhoneNumber,
  PolicyVersion,
  Vin,
} from '@det/backend-crm-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import { mapClientToDomain, mapClientToPersistence } from './crm-client.mapper';
import { CrmClientSchema } from '../persistence/client/crm-client.schema';
import { CrmConsentSchema } from '../persistence/client/crm-consent.schema';
import { CrmVehicleSchema } from '../persistence/client/crm-vehicle.schema';

const NOW = DateTime.from('2026-01-15T10:00:00.000Z');

let idCounter = 0;
const idGen: IIdGenerator = {
  generate: () => {
    idCounter++;

    return `${idCounter.toString().padStart(8, '0')}-0000-4000-8000-000000000000`;
  },
};

function buildClient(): Client {
  idCounter = 0;

  const consents = ConsentSet.empty()
    .give(ConsentType.PERSONAL_DATA_PROCESSING, NOW.toDate(), PolicyVersion.from('1.0.0'))
    .give(ConsentType.MARKETING_NOTIFICATIONS, NOW.toDate(), PolicyVersion.from('1.0.0'));

  const client = Client.registerRegular({
    idGen,
    fullName: FullName.create('Иванов', 'Иван', 'Иванович'),
    phone: PhoneNumber.from('+79991234567'),
    email: Email.from('ivan@example.com'),
    birthDate: new Date('1990-05-15'),
    source: null,
    consents,
    comment: 'VIP',
    now: NOW,
  });

  client.addVehicle(
    {
      idGen,
      make: 'BMW',
      model: 'X5',
      bodyType: BodyType.SUV,
      licensePlate: LicensePlate.from('А001АА777'),
      vin: Vin.from('WBAPH5C55BA123456'),
      year: 2022,
      color: 'Black',
      comment: 'Основной',
    },
    NOW,
  );

  client.addVehicle(
    {
      idGen,
      make: 'Mercedes',
      model: 'GLE',
      bodyType: BodyType.CROSSOVER,
      licensePlate: null,
      vin: null,
      year: 2023,
      color: 'White',
      comment: '',
    },
    NOW,
  );

  client.pullDomainEvents();

  return client;
}

describe('CrmClientMapper', () => {
  it('round-trips client with 2 vehicles and consents without data loss', () => {
    const original = buildClient();
    const originalSnapshot = original.toSnapshot();

    const { clientSchema, vehicleSchemas, consentSchemas } = mapClientToPersistence(
      original,
      null,
      [],
      [],
      () => new CrmClientSchema(),
      () => new CrmVehicleSchema(),
      () => new CrmConsentSchema(),
    );

    expect(vehicleSchemas).toHaveLength(2);
    expect(consentSchemas).toHaveLength(2);

    const restored = mapClientToDomain(clientSchema, vehicleSchemas, consentSchemas);
    const restoredSnapshot = restored.toSnapshot();

    expect(restoredSnapshot.id).toBe(originalSnapshot.id);
    expect(restoredSnapshot.fullName).toEqual(originalSnapshot.fullName);
    expect(restoredSnapshot.phone).toBe(originalSnapshot.phone);
    expect(restoredSnapshot.email).toBe(originalSnapshot.email);
    expect(restoredSnapshot.type).toBe(originalSnapshot.type);
    expect(restoredSnapshot.status).toBe(originalSnapshot.status);
    expect(restoredSnapshot.comment).toBe(originalSnapshot.comment);

    expect(restoredSnapshot.vehicles).toHaveLength(2);
    expect(restoredSnapshot.vehicles[0]?.make).toBe('BMW');
    expect(restoredSnapshot.vehicles[0]?.vin).toBe('WBAPH5C55BA123456');
    expect(restoredSnapshot.vehicles[1]?.make).toBe('Mercedes');

    expect(restoredSnapshot.consents).toHaveLength(2);
    expect(restoredSnapshot.consents[0]?.type).toBe(ConsentType.PERSONAL_DATA_PROCESSING);
    expect(restoredSnapshot.consents[1]?.type).toBe(ConsentType.MARKETING_NOTIFICATIONS);
  });

  it('updates existing schemas on second persistence', () => {
    const client = buildClient();

    const firstResult = mapClientToPersistence(
      client,
      null,
      [],
      [],
      () => new CrmClientSchema(),
      () => new CrmVehicleSchema(),
      () => new CrmConsentSchema(),
    );

    const updatedClient = mapClientToDomain(
      firstResult.clientSchema,
      firstResult.vehicleSchemas,
      firstResult.consentSchemas,
    );

    updatedClient.updateProfile(
      { comment: 'Updated VIP' },
      DateTime.from('2026-02-01T10:00:00.000Z'),
    );
    updatedClient.pullDomainEvents();

    const secondResult = mapClientToPersistence(
      updatedClient,
      firstResult.clientSchema,
      firstResult.vehicleSchemas,
      firstResult.consentSchemas,
      () => new CrmClientSchema(),
      () => new CrmVehicleSchema(),
      () => new CrmConsentSchema(),
    );

    expect(secondResult.clientSchema).toBe(firstResult.clientSchema);
    expect(secondResult.clientSchema.comment).toBe('Updated VIP');
    expect(secondResult.vehicleSchemas).toHaveLength(2);
  });

  it('maps schema fields correctly', () => {
    const client = buildClient();
    const snapshot = client.toSnapshot();

    const { clientSchema, vehicleSchemas } = mapClientToPersistence(
      client,
      null,
      [],
      [],
      () => new CrmClientSchema(),
      () => new CrmVehicleSchema(),
      () => new CrmConsentSchema(),
    );

    expect(clientSchema.lastName).toBe(snapshot.fullName.last);
    expect(clientSchema.firstName).toBe(snapshot.fullName.first);
    expect(clientSchema.middleName).toBe(snapshot.fullName.middle);
    expect(clientSchema.phoneE164).toBe(snapshot.phone);
    expect(clientSchema.email).toBe(snapshot.email);
    expect(clientSchema.status).toBe(ClientStatus.ACTIVE);
    expect(clientSchema.type).toBe(ClientType.REGULAR);

    const bmw = vehicleSchemas.find((v) => v.make === 'BMW');
    expect(bmw?.licensePlate).toBe('А001АА777');
    expect(bmw?.vin).toBe('WBAPH5C55BA123456');
    expect(bmw?.bodyType).toBe(BodyType.SUV);
    expect(bmw?.isActive).toBe(true);
  });
});
