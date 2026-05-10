import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import type {
  ClientDetailReadModel,
  ClientListItemReadModel,
  VehicleReadModel,
  IClientReadPort,
  ListClientsFilter,
  PaginatedResult,
} from '@det/backend-crm-application';
import type { ConsentRecord } from '@det/backend-crm-domain';

import { CrmClientSchema } from '../persistence/client/crm-client.schema';
import { CrmConsentSchema } from '../persistence/client/crm-consent.schema';
import { CrmVehicleSchema } from '../persistence/client/crm-vehicle.schema';

@Injectable()
export class CrmClientReadAdapter implements IClientReadPort {
  constructor(private readonly em: EntityManager) {}

  async list(filter: ListClientsFilter): Promise<PaginatedResult<ClientListItemReadModel>> {
    const [schemas, total] = await this.em.findAndCount(
      CrmClientSchema,
      {},
      {
        orderBy: { createdAt: 'DESC' },
        limit: filter.pageSize,
        offset: (filter.page - 1) * filter.pageSize,
      },
    );

    return {
      items: schemas.map((s) => ({
        id: s.id,
        fullName: [s.lastName, s.firstName, s.middleName].filter(Boolean).join(' '),
        phone: s.phoneE164,
        type: s.type as ClientDetailReadModel['type'],
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(id: string): Promise<ClientDetailReadModel | null> {
    const schema = await this.em.findOne(CrmClientSchema, { id });

    if (!schema) return null;

    const vehicles = await this.em.find(CrmVehicleSchema, { client: schema });
    const consents = await this.em.find(CrmConsentSchema, { client: schema });

    return {
      id: schema.id,
      fullName: { last: schema.lastName, first: schema.firstName, middle: schema.middleName },
      phone: schema.phoneE164,
      email: schema.email,
      birthDate: schema.birthDate?.toISOString() ?? null,
      source: schema.source as ClientDetailReadModel['source'],
      type: schema.type as ClientDetailReadModel['type'],
      status: schema.status,
      comment: schema.comment,
      createdAt: schema.createdAt.toISOString(),
      anonymizedAt: schema.anonymizedAt?.toISOString() ?? null,
      consents: consents.map((c) => ({
        type: c.type as ConsentRecord['type'],
        givenAt: c.givenAt,
        revokedAt: c.revokedAt,
        policyVersion: c.policyVersion as ConsentRecord['policyVersion'],
      })),
      vehicles: vehicles.map((v) => this.toVehicleReadModel(v)),
    };
  }

  async findByPhone(phone: string): Promise<ClientDetailReadModel | null> {
    const schema = await this.em.findOne(CrmClientSchema, { phoneE164: phone });

    if (!schema) return null;

    return this.findById(schema.id);
  }

  async findVehicles(clientId: string): Promise<VehicleReadModel[]> {
    const client = await this.em.findOne(CrmClientSchema, { id: clientId });

    if (!client) return [];

    const vehicles = await this.em.find(CrmVehicleSchema, { client });

    return vehicles.map((v) => this.toVehicleReadModel(v));
  }

  private toVehicleReadModel(v: CrmVehicleSchema): VehicleReadModel {
    return {
      id: v.id,
      make: v.make,
      model: v.model,
      bodyType: v.bodyType,
      licensePlate: v.licensePlate,
      vin: v.vin,
      year: v.year,
      color: v.color,
      comment: v.comment,
      isActive: v.isActive,
    };
  }
}
