import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { ClientStatus } from '@det/backend-crm-domain';
import type {
  Client,
  ClientId,
  IClientRepository,
  PhoneNumber,
  Vin,
} from '@det/backend-crm-domain';
import { OutboxService } from '@det/backend-shared-outbox';

import { mapClientToDomain, mapClientToPersistence } from '../mappers/crm-client.mapper';
import { CrmClientSchema } from '../persistence/client/crm-client.schema';
import { CrmConsentSchema } from '../persistence/client/crm-consent.schema';
import { CrmVehicleSchema } from '../persistence/client/crm-vehicle.schema';

@Injectable()
export class CrmClientRepository implements IClientRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: ClientId): Promise<Client | null> {
    const schema = await this.em.findOne(CrmClientSchema, { id });

    if (!schema) return null;

    const vehicles = await this.em.find(CrmVehicleSchema, { client: schema });
    const consents = await this.em.find(CrmConsentSchema, { client: schema });

    return mapClientToDomain(schema, vehicles, consents);
  }

  async findByPhone(phone: PhoneNumber): Promise<Client | null> {
    const schema = await this.em.findOne(CrmClientSchema, {
      phoneE164: phone.toString(),
      status: { $ne: ClientStatus.ANONYMIZED },
    });

    if (!schema) return null;

    const vehicles = await this.em.find(CrmVehicleSchema, { client: schema });
    const consents = await this.em.find(CrmConsentSchema, { client: schema });

    return mapClientToDomain(schema, vehicles, consents);
  }

  async findByVehicleVin(vin: Vin): Promise<Client | null> {
    const vehicleSchema = await this.em.findOne(CrmVehicleSchema, { vin: vin.value });

    if (!vehicleSchema) return null;

    const clientRef = vehicleSchema.client;
    const clientId = typeof clientRef === 'string' ? clientRef : clientRef.id;
    const clientSchema = await this.em.findOne(CrmClientSchema, { id: clientId });

    if (!clientSchema) return null;

    const vehicles = await this.em.find(CrmVehicleSchema, { client: clientSchema });
    const consents = await this.em.find(CrmConsentSchema, { client: clientSchema });

    return mapClientToDomain(clientSchema, vehicles, consents);
  }

  async save(client: Client): Promise<void> {
    const existingClient = await this.em.findOne(CrmClientSchema, { id: client.id });
    const existingVehicles = existingClient
      ? await this.em.find(CrmVehicleSchema, { client: existingClient })
      : [];
    const existingConsents = existingClient
      ? await this.em.find(CrmConsentSchema, { client: existingClient })
      : [];

    const { clientSchema, vehicleSchemas, consentSchemas } = mapClientToPersistence(
      client,
      existingClient,
      existingVehicles,
      existingConsents,
      () => new CrmClientSchema(),
      () => new CrmVehicleSchema(),
      () => new CrmConsentSchema(),
    );

    const events = client.pullDomainEvents();

    for (const event of events) {
      await this.outbox.append(event, this.em);
    }

    this.em.persist(clientSchema);

    for (const vs of vehicleSchemas) {
      this.em.persist(vs);
    }

    for (const cs of consentSchemas) {
      this.em.persist(cs);
    }

    await this.em.flush();
  }
}
