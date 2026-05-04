import type { Brand } from './brand';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidUuidError extends Error {
  constructor(value: string) {
    super(`Invalid UUID: ${value}`);
    this.name = 'InvalidUuidError';
  }
}

function fromUuid<TBrand extends string>(value: string): Brand<string, TBrand> {
  if (!UUID_PATTERN.test(value)) {
    throw new InvalidUuidError(value);
  }

  return value as Brand<string, TBrand>;
}

export type UserId = Brand<string, 'UserId'>;
export const UserId = {
  from(value: string): UserId {
    return fromUuid<'UserId'>(value);
  },
};

export type OrgId = Brand<string, 'OrgId'>;
export const OrgId = {
  from(value: string): OrgId {
    return fromUuid<'OrgId'>(value);
  },
};

export type BranchId = Brand<string, 'BranchId'>;
export const BranchId = {
  from(value: string): BranchId {
    return fromUuid<'BranchId'>(value);
  },
};

export type ClientId = Brand<string, 'ClientId'>;
export const ClientId = {
  from(value: string): ClientId {
    return fromUuid<'ClientId'>(value);
  },
};

export type AppointmentId = Brand<string, 'AppointmentId'>;
export const AppointmentId = {
  from(value: string): AppointmentId {
    return fromUuid<'AppointmentId'>(value);
  },
};

export type WorkOrderId = Brand<string, 'WorkOrderId'>;
export const WorkOrderId = {
  from(value: string): WorkOrderId {
    return fromUuid<'WorkOrderId'>(value);
  },
};

export type SkuId = Brand<string, 'SkuId'>;
export const SkuId = {
  from(value: string): SkuId {
    return fromUuid<'SkuId'>(value);
  },
};

export type ServiceId = Brand<string, 'ServiceId'>;
export const ServiceId = {
  from(value: string): ServiceId {
    return fromUuid<'ServiceId'>(value);
  },
};

export type BatchId = Brand<string, 'BatchId'>;
export const BatchId = {
  from(value: string): BatchId {
    return fromUuid<'BatchId'>(value);
  },
};

export type InvitationId = Brand<string, 'InvitationId'>;
export const InvitationId = {
  from(value: string): InvitationId {
    return fromUuid<'InvitationId'>(value);
  },
};

export type OutboxEventId = Brand<string, 'OutboxEventId'>;
export const OutboxEventId = {
  from(value: string): OutboxEventId {
    return fromUuid<'OutboxEventId'>(value);
  },
};
