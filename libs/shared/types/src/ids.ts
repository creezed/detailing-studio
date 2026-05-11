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

export type AppointmentServiceId = Brand<string, 'AppointmentServiceId'>;
export const AppointmentServiceId = {
  from(value: string): AppointmentServiceId {
    return fromUuid<'AppointmentServiceId'>(value);
  },
};

export type CancellationRequestId = Brand<string, 'CancellationRequestId'>;
export const CancellationRequestId = {
  from(value: string): CancellationRequestId {
    return fromUuid<'CancellationRequestId'>(value);
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

export type ServiceCategoryId = Brand<string, 'ServiceCategoryId'>;
export const ServiceCategoryId = {
  from(value: string): ServiceCategoryId {
    return fromUuid<'ServiceCategoryId'>(value);
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

export type OtpRequestId = Brand<string, 'OtpRequestId'>;
export const OtpRequestId = {
  from(value: string): OtpRequestId {
    return fromUuid<'OtpRequestId'>(value);
  },
};

export type SessionId = Brand<string, 'SessionId'>;
export const SessionId = {
  from(value: string): SessionId {
    return fromUuid<'SessionId'>(value);
  },
};

export type SupplierId = Brand<string, 'SupplierId'>;
export const SupplierId = {
  from(value: string): SupplierId {
    return fromUuid<'SupplierId'>(value);
  },
};

export type ReceiptId = Brand<string, 'ReceiptId'>;
export const ReceiptId = {
  from(value: string): ReceiptId {
    return fromUuid<'ReceiptId'>(value);
  },
};

export type AdjustmentId = Brand<string, 'AdjustmentId'>;
export const AdjustmentId = {
  from(value: string): AdjustmentId {
    return fromUuid<'AdjustmentId'>(value);
  },
};

export type TransferId = Brand<string, 'TransferId'>;
export const TransferId = {
  from(value: string): TransferId {
    return fromUuid<'TransferId'>(value);
  },
};

export type StockTakingId = Brand<string, 'StockTakingId'>;
export const StockTakingId = {
  from(value: string): StockTakingId {
    return fromUuid<'StockTakingId'>(value);
  },
};

export type MasterId = Brand<string, 'MasterId'>;
export const MasterId = {
  from(value: string): MasterId {
    return fromUuid<'MasterId'>(value);
  },
};

export type UnavailabilityId = Brand<string, 'UnavailabilityId'>;
export const UnavailabilityId = {
  from(value: string): UnavailabilityId {
    return fromUuid<'UnavailabilityId'>(value);
  },
};

export type BayId = Brand<string, 'BayId'>;
export const BayId = {
  from(value: string): BayId {
    return fromUuid<'BayId'>(value);
  },
};

export type ScheduleId = Brand<string, 'ScheduleId'>;
export const ScheduleId = {
  from(value: string): ScheduleId {
    return fromUuid<'ScheduleId'>(value);
  },
};

export type VehicleId = Brand<string, 'VehicleId'>;
export const VehicleId = {
  from(value: string): VehicleId {
    return fromUuid<'VehicleId'>(value);
  },
};

export type OutboxEventId = Brand<string, 'OutboxEventId'>;
export const OutboxEventId = {
  from(value: string): OutboxEventId {
    return fromUuid<'OutboxEventId'>(value);
  },
};
