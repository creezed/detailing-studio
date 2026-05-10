import type {
  ClientSource,
  ClientStatus,
  ClientType,
  ConsentRecord,
} from '@det/backend-crm-domain';

export interface ClientListItemReadModel {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly type: ClientType;
  readonly status: ClientStatus;
  readonly createdAt: string;
}

export interface VehicleReadModel {
  readonly id: string;
  readonly make: string;
  readonly model: string;
  readonly bodyType: string;
  readonly licensePlate: string | null;
  readonly vin: string | null;
  readonly year: number | null;
  readonly color: string | null;
  readonly comment: string;
  readonly isActive: boolean;
}

export interface ClientDetailReadModel {
  readonly id: string;
  readonly fullName: { last: string; first: string; middle: string | null };
  readonly phone: string;
  readonly email: string | null;
  readonly birthDate: string | null;
  readonly source: ClientSource | null;
  readonly type: ClientType;
  readonly status: ClientStatus;
  readonly comment: string;
  readonly consents: readonly ConsentRecord[];
  readonly vehicles: readonly VehicleReadModel[];
  readonly createdAt: string;
  readonly anonymizedAt: string | null;
}
