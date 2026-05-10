import type {
  ClientDetailReadModel,
  ClientListItemReadModel,
  VehicleReadModel,
} from '../read-models/client.read-model';

export const CLIENT_READ_PORT = Symbol('CLIENT_READ_PORT');

export interface ListClientsFilter {
  readonly page: number;
  readonly pageSize: number;
  readonly fullName?: string;
  readonly phone?: string;
  readonly licensePlate?: string;
  readonly type?: string;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface IClientReadPort {
  list(filter: ListClientsFilter): Promise<PaginatedResult<ClientListItemReadModel>>;
  findById(id: string): Promise<ClientDetailReadModel | null>;
  findByPhone(phone: string): Promise<ClientDetailReadModel | null>;
  findVehicles(clientId: string): Promise<readonly VehicleReadModel[]>;
}
