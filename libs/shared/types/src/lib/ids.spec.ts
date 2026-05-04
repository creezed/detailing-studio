import {
  AppointmentId,
  BatchId,
  BranchId,
  ClientId,
  InvalidUuidError,
  OrgId,
  OutboxEventId,
  ServiceId,
  SkuId,
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
    expect(OutboxEventId.from(UUID)).toBe(UUID);
  });

  it('throws when value is not a UUID', () => {
    expect(() => UserId.from('not-a-uuid')).toThrow(InvalidUuidError);
  });
});
