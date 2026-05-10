import { DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { UserId } from '@det/shared-types';

import { Client } from './client.aggregate';
import {
  CannotRevokePersonalDataConsentError,
  ClientAlreadyRegularError,
  ClientAnonymizedError,
  InvalidEmailError,
  InvalidFullNameError,
  InvalidPhoneNumberError,
  InvalidVinError,
  MissingMandatoryConsentError,
  VehicleAlreadyDeactivatedError,
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
import { ClientBuilder } from '../testing/client.builder';
import { FixedIdGenerator } from '../testing/fixed-id-generator';
import { BodyType } from '../value-objects/body-type';
import { ClientStatus } from '../value-objects/client-status';
import { ClientType } from '../value-objects/client-type';
import { ConsentSet } from '../value-objects/consent-set';
import { ConsentType } from '../value-objects/consent-type';
import { Email } from '../value-objects/email.value-object';
import { FullName } from '../value-objects/full-name.value-object';
import { LicensePlate } from '../value-objects/license-plate.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';
import { PolicyVersion } from '../value-objects/policy-version';
import { Vin } from '../value-objects/vin.value-object';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '22222222-2222-4222-8222-222222222222';
const VEHICLE_ID_2 = '33333333-3333-4333-8333-333333333333';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const NOW = DateTime.from('2026-01-15T10:00:00.000Z');
const LATER = DateTime.from('2026-01-16T10:00:00.000Z');
const POLICY_V1 = PolicyVersion.from('1.0.0');
const POLICY_V2 = PolicyVersion.from('2.0.0');

function idGen(...ids: string[]): IIdGenerator {
  return new FixedIdGenerator(ids.length > 0 ? ids : [CLIENT_ID]);
}

describe('Client aggregate', () => {
  describe('registerRegular', () => {
    it('creates a REGULAR client with ACTIVE status', () => {
      const client = new ClientBuilder().build();
      const snapshot = client.toSnapshot();

      expect(snapshot.type).toBe(ClientType.REGULAR);
      expect(snapshot.status).toBe(ClientStatus.ACTIVE);
      expect(snapshot.id).toBe(CLIENT_ID);
      expect(snapshot.fullName).toEqual({ last: 'Иванов', first: 'Иван', middle: 'Иванович' });
      expect(snapshot.phone).toBe('+79990001111');
      expect(snapshot.email).toBe('ivan@example.com');
    });

    it('emits ClientRegistered event with REGULAR type', () => {
      const client = new ClientBuilder().build();
      const events = client.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientRegistered);

      const event = events[0] as ClientRegistered;
      expect(event.clientType).toBe(ClientType.REGULAR);
      expect(event.clientId).toBe(CLIENT_ID);
    });

    it('throws MissingMandatoryConsentError when PERSONAL_DATA_PROCESSING is missing', () => {
      expect(() => new ClientBuilder().withoutConsents().build()).toThrow(
        MissingMandatoryConsentError,
      );
    });

    it('allows null email for REGULAR client', () => {
      const client = new ClientBuilder().withEmail(null).build();

      expect(client.toSnapshot().email).toBeNull();
    });
  });

  describe('registerGuest', () => {
    it('creates a GUEST client', () => {
      const client = new ClientBuilder().asGuest().build();
      const snapshot = client.toSnapshot();

      expect(snapshot.type).toBe(ClientType.GUEST);
      expect(snapshot.status).toBe(ClientStatus.ACTIVE);
    });

    it('emits ClientRegistered with GUEST type', () => {
      const client = new ClientBuilder().asGuest().build();
      const events = client.pullDomainEvents();

      expect(events).toHaveLength(1);
      const event = events[0] as ClientRegistered;
      expect(event.clientType).toBe(ClientType.GUEST);
    });

    it('throws MissingMandatoryConsentError without PERSONAL_DATA_PROCESSING', () => {
      expect(() => new ClientBuilder().asGuest().withoutConsents().build()).toThrow(
        MissingMandatoryConsentError,
      );
    });

    it('allows null email for GUEST', () => {
      const client = new ClientBuilder().asGuest().withEmail(null).build();

      expect(client.toSnapshot().email).toBeNull();
    });
  });

  describe('upgradeToRegular', () => {
    it('upgrades GUEST to REGULAR and emits event', () => {
      const client = new ClientBuilder().asGuest().build();
      client.pullDomainEvents();

      client.upgradeToRegular(LATER);

      expect(client.toSnapshot().type).toBe(ClientType.REGULAR);
      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientUpgradedToRegular);
    });

    it('throws ClientAlreadyRegularError for REGULAR client', () => {
      const client = new ClientBuilder().build();

      expect(() => {
        client.upgradeToRegular(LATER);
      }).toThrow(ClientAlreadyRegularError);
    });

    it('throws ClientAnonymizedError on anonymized client', () => {
      const client = new ClientBuilder().build();
      client.anonymize(UserId.from(ACTOR_ID), 'test', LATER);

      expect(() => {
        client.upgradeToRegular(LATER);
      }).toThrow(ClientAnonymizedError);
    });
  });

  describe('updateProfile', () => {
    it('updates profile fields and emits ClientProfileUpdated', () => {
      const client = new ClientBuilder().build();
      client.pullDomainEvents();

      const newName = FullName.create('Петров', 'Пётр');
      const newPhone = PhoneNumber.from('+79990002222');
      client.updateProfile({ fullName: newName, phone: newPhone }, LATER);

      const snapshot = client.toSnapshot();
      expect(snapshot.fullName).toEqual({ last: 'Петров', first: 'Пётр', middle: null });
      expect(snapshot.phone).toBe('+79990002222');

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientProfileUpdated);
    });

    it('throws ClientAnonymizedError on anonymized client', () => {
      const client = new ClientBuilder().build();
      client.anonymize(UserId.from(ACTOR_ID), 'test', LATER);

      expect(() => {
        client.updateProfile({ comment: 'new' }, LATER);
      }).toThrow(ClientAnonymizedError);
    });
  });

  describe('giveConsent', () => {
    it('adds a new consent and emits event', () => {
      const client = new ClientBuilder().build();
      client.pullDomainEvents();

      client.giveConsent(ConsentType.MARKETING_NOTIFICATIONS, LATER, POLICY_V2);

      const consents = client.toSnapshot().consents;
      const active = consents.filter((c) => c.revokedAt === null);
      expect(active).toHaveLength(2);

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientConsentGiven);

      const event = events[0] as ClientConsentGiven;
      expect(event.consentType).toBe(ConsentType.MARKETING_NOTIFICATIONS);
      expect(event.policyVersion).toBe(POLICY_V2);
    });

    it('is a no-op (no event) when consent already active', () => {
      const client = new ClientBuilder().build();
      client.pullDomainEvents();

      client.giveConsent(ConsentType.PERSONAL_DATA_PROCESSING, LATER, POLICY_V2);

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(0);
    });

    it('throws ClientAnonymizedError on anonymized client', () => {
      const client = new ClientBuilder().build();
      client.anonymize(UserId.from(ACTOR_ID), 'test', LATER);

      expect(() => {
        client.giveConsent(ConsentType.MARKETING_NOTIFICATIONS, LATER, POLICY_V1);
      }).toThrow(ClientAnonymizedError);
    });
  });

  describe('revokeConsent', () => {
    it('revokes MARKETING_NOTIFICATIONS consent and emits event', () => {
      const client = new ClientBuilder().build();
      client.giveConsent(ConsentType.MARKETING_NOTIFICATIONS, NOW, POLICY_V1);
      client.pullDomainEvents();

      client.revokeConsent(ConsentType.MARKETING_NOTIFICATIONS, LATER);

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientConsentRevoked);

      const event = events[0] as ClientConsentRevoked;
      expect(event.consentType).toBe(ConsentType.MARKETING_NOTIFICATIONS);
    });

    it('throws CannotRevokePersonalDataConsentError for PERSONAL_DATA_PROCESSING', () => {
      const client = new ClientBuilder().build();

      expect(() => {
        client.revokeConsent(ConsentType.PERSONAL_DATA_PROCESSING, LATER);
      }).toThrow(CannotRevokePersonalDataConsentError);
    });

    it('throws ConsentAlreadyRevokedError when consent not active', () => {
      const client = new ClientBuilder().build();

      expect(() => {
        client.revokeConsent(ConsentType.MARKETING_NOTIFICATIONS, LATER);
      }).toThrow();
    });

    it('throws ClientAnonymizedError on anonymized client', () => {
      const client = new ClientBuilder().build();
      client.giveConsent(ConsentType.MARKETING_NOTIFICATIONS, NOW, POLICY_V1);
      client.anonymize(UserId.from(ACTOR_ID), 'test', LATER);

      expect(() => {
        client.revokeConsent(ConsentType.MARKETING_NOTIFICATIONS, LATER);
      }).toThrow(ClientAnonymizedError);
    });
  });

  describe('addVehicle', () => {
    it('adds a vehicle and emits ClientVehicleAdded', () => {
      const client = new ClientBuilder().build();
      client.pullDomainEvents();

      const vehicleId = client.addVehicle(
        {
          make: 'BMW',
          model: 'X5',
          bodyType: BodyType.SUV,
          licensePlate: null,
          vin: Vin.from('WBAPH5C55BA123456'),
          year: 2023,
          color: 'Black',
          comment: '',
          idGen: idGen(VEHICLE_ID),
        },
        LATER,
      );

      expect(vehicleId).toBe(VEHICLE_ID);
      expect(client.toSnapshot().vehicles).toHaveLength(1);
      expect(client.toSnapshot().vehicles[0]?.make).toBe('BMW');

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientVehicleAdded);

      const event = events[0] as ClientVehicleAdded;
      expect(event.vehicleId).toBe(VEHICLE_ID);
    });

    it('throws ClientAnonymizedError on anonymized client', () => {
      const client = new ClientBuilder().build();
      client.anonymize(UserId.from(ACTOR_ID), 'test', LATER);

      expect(() =>
        client.addVehicle(
          {
            make: 'BMW',
            model: 'X5',
            bodyType: BodyType.SUV,
            licensePlate: null,
            vin: null,
            year: null,
            color: null,
            comment: '',
            idGen: idGen(VEHICLE_ID),
          },
          LATER,
        ),
      ).toThrow(ClientAnonymizedError);
    });
  });

  describe('updateVehicle', () => {
    it('updates vehicle attributes and emits event', () => {
      const { client } = new ClientBuilder().buildWithVehicle();
      client.pullDomainEvents();

      client.updateVehicle(VehicleId.from(VEHICLE_ID), { model: 'Corolla', color: 'Red' }, LATER);

      const snapshot = client.toSnapshot();
      expect(snapshot.vehicles[0]?.model).toBe('Corolla');
      expect(snapshot.vehicles[0]?.color).toBe('Red');

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientVehicleUpdated);
    });

    it('throws VehicleNotFoundError for unknown vehicle', () => {
      const client = new ClientBuilder().build();
      const unknownId = VehicleId.from(VEHICLE_ID);

      expect(() => {
        client.updateVehicle(unknownId, { color: 'Red' }, LATER);
      }).toThrow(VehicleNotFoundError);
    });

    it('throws ClientAnonymizedError on anonymized client', () => {
      const { client } = new ClientBuilder().buildWithVehicle();
      client.anonymize(UserId.from(ACTOR_ID), 'test', LATER);

      expect(() => {
        client.updateVehicle(VehicleId.from(VEHICLE_ID), { color: 'Red' }, LATER);
      }).toThrow(ClientAnonymizedError);
    });
  });

  describe('deactivateVehicle', () => {
    it('deactivates a vehicle and emits event', () => {
      const { client } = new ClientBuilder().buildWithVehicle();
      client.pullDomainEvents();

      client.deactivateVehicle(VehicleId.from(VEHICLE_ID), LATER);

      expect(client.toSnapshot().vehicles[0]?.isActive).toBe(false);

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientVehicleDeactivated);
    });

    it('throws VehicleAlreadyDeactivatedError on second deactivation', () => {
      const { client } = new ClientBuilder().buildWithVehicle();
      client.deactivateVehicle(VehicleId.from(VEHICLE_ID), LATER);

      expect(() => {
        client.deactivateVehicle(VehicleId.from(VEHICLE_ID), LATER);
      }).toThrow(VehicleAlreadyDeactivatedError);
    });
  });

  describe('anonymize', () => {
    it('anonymizes client data and emits ClientAnonymized', () => {
      const { client } = new ClientBuilder().buildWithVehicle();
      client.pullDomainEvents();
      const actorId = UserId.from(ACTOR_ID);

      client.anonymize(actorId, '152-ФЗ request', LATER);

      const snapshot = client.toSnapshot();
      expect(snapshot.status).toBe(ClientStatus.ANONYMIZED);
      expect(snapshot.fullName.last).toContain('ANONYMIZED_');
      expect(snapshot.fullName.first).toContain('ANONYMIZED_');
      expect(snapshot.email).toBeNull();
      expect(snapshot.birthDate).toBeNull();
      expect(snapshot.comment).toBe('');
      expect(snapshot.anonymizedAt).toBe(LATER.iso());
      expect(snapshot.vehicles[0]?.isActive).toBe(false);

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ClientAnonymized);

      const event = events[0] as ClientAnonymized;
      expect(event.reason).toBe('152-ФЗ request');
      expect(event.anonymizedBy).toBe(ACTOR_ID);
    });

    it('ClientAnonymized event does NOT contain PII', () => {
      const client = new ClientBuilder()
        .withFullName('Секретов', 'Иван')
        .withPhone('+79990009999')
        .withEmail('secret@example.com')
        .build();
      client.pullDomainEvents();

      client.anonymize(UserId.from(ACTOR_ID), 'gdpr', LATER);

      const events = client.pullDomainEvents();
      const event = events[0] as ClientAnonymized;

      const eventJson = JSON.stringify(event);
      expect(eventJson).not.toContain('Секретов');
      expect(eventJson).not.toContain('secret@example.com');
      expect(eventJson).not.toContain('+79990009999');
    });

    it('is idempotent — second call is no-op without events', () => {
      const client = new ClientBuilder().build();
      client.anonymize(UserId.from(ACTOR_ID), 'first', LATER);
      client.pullDomainEvents();

      client.anonymize(UserId.from(ACTOR_ID), 'second', LATER);

      const events = client.pullDomainEvents();
      expect(events).toHaveLength(0);
    });

    it('deactivates all active vehicles', () => {
      const client = new ClientBuilder().build();
      client.addVehicle(
        {
          make: 'BMW',
          model: 'X5',
          bodyType: BodyType.SUV,
          licensePlate: null,
          vin: null,
          year: null,
          color: null,
          comment: '',
          idGen: idGen(VEHICLE_ID),
        },
        NOW,
      );
      client.addVehicle(
        {
          make: 'Audi',
          model: 'Q7',
          bodyType: BodyType.SUV,
          licensePlate: null,
          vin: null,
          year: null,
          color: null,
          comment: '',
          idGen: idGen(VEHICLE_ID_2),
        },
        NOW,
      );

      client.anonymize(UserId.from(ACTOR_ID), 'test', LATER);

      const snapshot = client.toSnapshot();
      expect(snapshot.vehicles.every((v) => !v.isActive)).toBe(true);
    });
  });

  describe('restore', () => {
    it('restores client from snapshot without emitting events', () => {
      const original = new ClientBuilder().build();
      const snapshot = original.toSnapshot();
      original.pullDomainEvents();

      const restored = Client.restore(snapshot, []);

      expect(restored.toSnapshot()).toMatchObject({
        id: snapshot.id,
        fullName: snapshot.fullName,
        type: snapshot.type,
        status: snapshot.status,
      });
      expect(restored.pullDomainEvents()).toEqual([]);
    });
  });
});

describe('Value Objects', () => {
  describe('FullName', () => {
    it('creates valid FullName with all fields', () => {
      const name = FullName.create('Иванов', 'Иван', 'Иванович');

      expect(name.last).toBe('Иванов');
      expect(name.first).toBe('Иван');
      expect(name.middle).toBe('Иванович');
      expect(name.format()).toBe('Иванов Иван Иванович');
    });

    it('creates FullName without middle name', () => {
      const name = FullName.create('Doe', 'John');
      expect(name.middle).toBeNull();
      expect(name.format()).toBe('Doe John');
    });

    it('throws InvalidFullNameError for empty last name', () => {
      expect(() => FullName.create('', 'John')).toThrow(InvalidFullNameError);
    });

    it('throws InvalidFullNameError for empty first name', () => {
      expect(() => FullName.create('Doe', '')).toThrow(InvalidFullNameError);
    });

    it('trims whitespace', () => {
      const name = FullName.create('  Doe  ', '  John  ');
      expect(name.last).toBe('Doe');
      expect(name.first).toBe('John');
    });
  });

  describe('PhoneNumber', () => {
    it('accepts valid +7XXXXXXXXXX format', () => {
      const phone = PhoneNumber.from('+79991234567');
      expect(phone.value).toBe('+79991234567');
    });

    it('rejects phone without +7 prefix', () => {
      expect(() => PhoneNumber.from('+19991234567')).toThrow(InvalidPhoneNumberError);
    });

    it('rejects phone with wrong length', () => {
      expect(() => PhoneNumber.from('+7999123456')).toThrow(InvalidPhoneNumberError);
      expect(() => PhoneNumber.from('+799912345678')).toThrow(InvalidPhoneNumberError);
    });

    it('rejects non-numeric characters', () => {
      expect(() => PhoneNumber.from('+7999abc4567')).toThrow(InvalidPhoneNumberError);
    });
  });

  describe('Email', () => {
    it('normalizes to lowercase', () => {
      const email = Email.from('User@Example.COM');
      expect(email.value).toBe('user@example.com');
    });

    it('rejects invalid format', () => {
      expect(() => Email.from('not-an-email')).toThrow(InvalidEmailError);
      expect(() => Email.from('@missing-local.com')).toThrow(InvalidEmailError);
    });
  });

  describe('Vin', () => {
    it('accepts valid 17-char VIN', () => {
      const vin = Vin.from('WBAPH5C55BA123456');
      expect(vin.value).toBe('WBAPH5C55BA123456');
    });

    it('normalizes to uppercase', () => {
      const vin = Vin.from('wbaph5c55ba123456');
      expect(vin.value).toBe('WBAPH5C55BA123456');
    });

    it('rejects VIN with I, O, Q', () => {
      expect(() => Vin.from('WBAPH5I55BA123456')).toThrow(InvalidVinError);
      expect(() => Vin.from('WBAPH5O55BA123456')).toThrow(InvalidVinError);
      expect(() => Vin.from('WBAPH5Q55BA123456')).toThrow(InvalidVinError);
    });

    it('rejects VIN with wrong length', () => {
      expect(() => Vin.from('WBAPH5C55BA12345')).toThrow(InvalidVinError);
      expect(() => Vin.from('WBAPH5C55BA1234567')).toThrow(InvalidVinError);
    });
  });

  describe('LicensePlate', () => {
    it('creates valid plate and normalizes to uppercase', () => {
      const plate = LicensePlate.from('а001аа77');
      expect(plate.value).toBe('А001АА77');
    });

    it('rejects empty string', () => {
      expect(() => LicensePlate.from('')).toThrow();
    });
  });

  describe('PolicyVersion', () => {
    it('creates brand string', () => {
      const v = PolicyVersion.from('1.0.0');
      expect(v).toBe('1.0.0');
    });

    it('rejects empty string', () => {
      expect(() => PolicyVersion.from('')).toThrow();
    });
  });

  describe('ConsentSet', () => {
    it('give() adds a new consent', () => {
      const set = ConsentSet.empty().give(
        ConsentType.PERSONAL_DATA_PROCESSING,
        NOW.toDate(),
        POLICY_V1,
      );

      expect(set.has(ConsentType.PERSONAL_DATA_PROCESSING)).toBe(true);
      expect(set.listActive()).toHaveLength(1);
    });

    it('give() is idempotent — returns same instance when already active', () => {
      const set = ConsentSet.empty().give(
        ConsentType.PERSONAL_DATA_PROCESSING,
        NOW.toDate(),
        POLICY_V1,
      );
      const set2 = set.give(ConsentType.PERSONAL_DATA_PROCESSING, LATER.toDate(), POLICY_V2);

      expect(set2).toBe(set);
    });

    it('revoke() marks consent as revoked', () => {
      const set = ConsentSet.empty().give(
        ConsentType.MARKETING_NOTIFICATIONS,
        NOW.toDate(),
        POLICY_V1,
      );

      const revoked = set.revoke(ConsentType.MARKETING_NOTIFICATIONS, LATER.toDate());

      expect(revoked.has(ConsentType.MARKETING_NOTIFICATIONS)).toBe(false);
      expect(revoked.listActive()).toHaveLength(0);
    });

    it('revoke() throws ConsentAlreadyRevokedError when not active', () => {
      const set = ConsentSet.empty();

      expect(() => set.revoke(ConsentType.MARKETING_NOTIFICATIONS, NOW.toDate())).toThrow();
    });

    it('toArray() returns all records', () => {
      const set = ConsentSet.empty()
        .give(ConsentType.PERSONAL_DATA_PROCESSING, NOW.toDate(), POLICY_V1)
        .give(ConsentType.MARKETING_NOTIFICATIONS, NOW.toDate(), POLICY_V1);

      expect(set.toArray()).toHaveLength(2);
    });
  });
});

describe('Vehicle entity', () => {
  it('deactivate() then reactivate() toggles isActive', () => {
    const { client } = new ClientBuilder().buildWithVehicle();
    const vid = VehicleId.from(VEHICLE_ID);

    client.deactivateVehicle(vid, LATER);
    expect(client.toSnapshot().vehicles[0]?.isActive).toBe(false);
  });

  it('repeated deactivation throws VehicleAlreadyDeactivatedError', () => {
    const { client } = new ClientBuilder().buildWithVehicle();
    const vid = VehicleId.from(VEHICLE_ID);

    client.deactivateVehicle(vid, LATER);

    expect(() => {
      client.deactivateVehicle(vid, LATER);
    }).toThrow(VehicleAlreadyDeactivatedError);
  });
});
