import { randomUUID } from 'node:crypto';

import { Client, LicensePlate, Vehicle, Vin } from '@det/backend-crm-domain';
import type {
  ClientSnapshot,
  ClientSource,
  ClientType,
  ConsentRecord,
  VehicleSnapshot,
  BodyType,
} from '@det/backend-crm-domain';

import type { CrmClientSchema } from '../persistence/client/crm-client.schema';
import type { CrmConsentSchema } from '../persistence/client/crm-consent.schema';
import type { CrmVehicleSchema } from '../persistence/client/crm-vehicle.schema';

export function mapClientToDomain(
  schema: CrmClientSchema,
  vehicleSchemas: readonly CrmVehicleSchema[],
  consentSchemas: readonly CrmConsentSchema[],
): Client {
  const consents: ConsentRecord[] = consentSchemas.map((c) => ({
    type: c.type as ConsentRecord['type'],
    givenAt: c.givenAt,
    revokedAt: c.revokedAt,
    policyVersion: c.policyVersion as ConsentRecord['policyVersion'],
  }));

  const vehicleSnapshots: VehicleSnapshot[] = vehicleSchemas.map((v) => ({
    id: v.id,
    make: v.make,
    model: v.model,
    bodyType: v.bodyType as BodyType,
    licensePlate: v.licensePlate,
    vin: v.vin,
    year: v.year,
    color: v.color,
    comment: v.comment,
    isActive: v.isActive,
  }));

  const vehicles = vehicleSnapshots.map((vs) =>
    Vehicle.restore(
      vs,
      vs.licensePlate !== null ? LicensePlate.from(vs.licensePlate) : null,
      vs.vin !== null ? Vin.from(vs.vin) : null,
    ),
  );

  const snapshot: ClientSnapshot = {
    id: schema.id,
    fullName: {
      last: schema.lastName,
      first: schema.firstName,
      middle: schema.middleName,
    },
    phone: schema.phoneE164,
    email: schema.email,
    birthDate: schema.birthDate?.toISOString() ?? null,
    source: schema.source as ClientSource | null,
    consents,
    type: schema.type as ClientType,
    comment: schema.comment,
    vehicles: vehicleSnapshots,
    status: schema.status,
    createdAt: schema.createdAt.toISOString(),
    anonymizedAt: schema.anonymizedAt?.toISOString() ?? null,
  };

  return Client.restore(snapshot, vehicles);
}

export interface ClientPersistenceResult {
  readonly clientSchema: CrmClientSchema;
  readonly vehicleSchemas: CrmVehicleSchema[];
  readonly consentSchemas: CrmConsentSchema[];
}

export function mapClientToPersistence(
  domain: Client,
  existingClient: CrmClientSchema | null,
  existingVehicles: CrmVehicleSchema[],
  existingConsents: CrmConsentSchema[],
  newClientSchema: () => CrmClientSchema,
  newVehicleSchema: () => CrmVehicleSchema,
  newConsentSchema: () => CrmConsentSchema,
): ClientPersistenceResult {
  const snapshot = domain.toSnapshot();

  const clientSchema = existingClient ?? newClientSchema();
  clientSchema.id = snapshot.id;
  clientSchema.lastName = snapshot.fullName.last;
  clientSchema.firstName = snapshot.fullName.first;
  clientSchema.middleName = snapshot.fullName.middle;
  clientSchema.phoneE164 = snapshot.phone;
  clientSchema.email = snapshot.email;
  clientSchema.birthDate = snapshot.birthDate !== null ? new Date(snapshot.birthDate) : null;
  clientSchema.source = snapshot.source;
  clientSchema.type = snapshot.type;
  clientSchema.status = snapshot.status;
  clientSchema.comment = snapshot.comment;
  clientSchema.createdAt = new Date(snapshot.createdAt);
  clientSchema.anonymizedAt =
    snapshot.anonymizedAt !== null ? new Date(snapshot.anonymizedAt) : null;

  const vehicleSchemas = snapshot.vehicles.map((vs) => {
    const existing = existingVehicles.find((ev) => ev.id === vs.id);
    const schema = existing ?? newVehicleSchema();
    schema.id = vs.id;
    schema.client = clientSchema;
    schema.make = vs.make;
    schema.model = vs.model;
    schema.bodyType = vs.bodyType;
    schema.licensePlate = vs.licensePlate;
    schema.vin = vs.vin;
    schema.year = vs.year;
    schema.color = vs.color;
    schema.comment = vs.comment;
    schema.isActive = vs.isActive;

    return schema;
  });

  const consentSchemas = snapshot.consents.map((cr) => {
    const existing = existingConsents.find(
      (ec) => ec.type === (cr.type as string) && ec.givenAt.getTime() === cr.givenAt.getTime(),
    );
    const schema = existing ?? newConsentSchema();

    if (!existing) {
      schema.id = randomUUID();
    }

    schema.client = clientSchema;
    schema.type = cr.type;
    schema.givenAt = cr.givenAt;
    schema.revokedAt = cr.revokedAt;
    schema.policyVersion = cr.policyVersion;

    return schema;
  });

  return { clientSchema, vehicleSchemas, consentSchemas };
}
