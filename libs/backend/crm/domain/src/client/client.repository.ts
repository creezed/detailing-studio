import type { ClientId } from './client-id';
import type { Client } from './client.aggregate';
import type { PhoneNumber } from '../value-objects/phone-number.value-object';
import type { Vin } from '../value-objects/vin.value-object';

export interface ClientListFilter {
  readonly page: number;
  readonly pageSize: number;
}

export interface IClientRepository {
  findById(id: ClientId): Promise<Client | null>;
  findByPhone(phone: PhoneNumber): Promise<Client | null>;
  findByVehicleVin(vin: Vin): Promise<Client | null>;
  save(client: Client): Promise<void>;
}
