import {
  AdjustmentId,
  AppointmentId,
  BatchId,
  BranchId,
  ClientId,
  InvitationId,
  InvalidUuidError,
  OrgId,
  OtpRequestId,
  OutboxEventId,
  ReceiptId,
  ServiceCategoryId,
  ServiceId,
  SessionId,
  SkuId,
  StockTakingId,
  SupplierId,
  TransferId,
  UserId,
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
  });

  it('throws when value is not a UUID', () => {
    expect(() => UserId.from('not-a-uuid')).toThrow(InvalidUuidError);
  });
});
