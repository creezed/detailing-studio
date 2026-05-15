import {
  AdjustmentId,
  AppointmentId,
  AppointmentServiceId,
  BatchId,
  BayId,
  BranchId,
  CancellationRequestId,
  ClientId,
  InvoiceId,
  InvitationId,
  InvalidUuidError,
  MasterId,
  OrgId,
  OtpRequestId,
  OutboxEventId,
  ReceiptId,
  ScheduleId,
  ServiceCategoryId,
  ServiceId,
  SessionId,
  SkuId,
  StockTakingId,
  SubscriptionId,
  SupplierId,
  TenantId,
  TransferId,
  UnavailabilityId,
  UserId,
  VehicleId,
  WorkOrderId,
} from './ids';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('branded ID factories', () => {
  it('returns the original UUID value with a brand type', () => {
    expect(UserId.from(UUID)).toBe(UUID);
    expect(OrgId.from(UUID)).toBe(UUID);
    expect(BranchId.from(UUID)).toBe(UUID);
    expect(ClientId.from(UUID)).toBe(UUID);
    expect(AppointmentId.from(UUID)).toBe(UUID);
    expect(WorkOrderId.from(UUID)).toBe(UUID);
    expect(SkuId.from(UUID)).toBe(UUID);
    expect(ServiceId.from(UUID)).toBe(UUID);
    expect(BatchId.from(UUID)).toBe(UUID);
    expect(InvitationId.from(UUID)).toBe(UUID);
    expect(OtpRequestId.from(UUID)).toBe(UUID);
    expect(SessionId.from(UUID)).toBe(UUID);
    expect(OutboxEventId.from(UUID)).toBe(UUID);
    expect(ServiceCategoryId.from(UUID)).toBe(UUID);
    expect(SupplierId.from(UUID)).toBe(UUID);
    expect(ReceiptId.from(UUID)).toBe(UUID);
    expect(AdjustmentId.from(UUID)).toBe(UUID);
    expect(TransferId.from(UUID)).toBe(UUID);
    expect(StockTakingId.from(UUID)).toBe(UUID);
    expect(MasterId.from(UUID)).toBe(UUID);
    expect(UnavailabilityId.from(UUID)).toBe(UUID);
    expect(BayId.from(UUID)).toBe(UUID);
    expect(ScheduleId.from(UUID)).toBe(UUID);
    expect(VehicleId.from(UUID)).toBe(UUID);
    expect(AppointmentServiceId.from(UUID)).toBe(UUID);
    expect(CancellationRequestId.from(UUID)).toBe(UUID);
    expect(SubscriptionId.from(UUID)).toBe(UUID);
    expect(InvoiceId.from(UUID)).toBe(UUID);
    expect(TenantId.from(UUID)).toBe(UUID);
  });

  it('throws when value is not a UUID', () => {
    expect(() => UserId.from('not-a-uuid')).toThrow(InvalidUuidError);
  });
});
