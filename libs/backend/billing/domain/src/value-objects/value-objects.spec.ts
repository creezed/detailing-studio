import { DateTime } from '@det/backend-shared-ddd';

import { PaymentRef } from './payment-ref';
import { Period } from './period';
import { PlanLimits } from './plan-limits';

describe('PaymentRef', () => {
  it('should create from a non-empty string', () => {
    const ref = PaymentRef.from('pay_123');
    expect(ref).toBe('pay_123');
  });

  it('should throw on empty string', () => {
    expect(() => PaymentRef.from('')).toThrow('PaymentRef cannot be empty');
  });

  it('should throw on whitespace-only string', () => {
    expect(() => PaymentRef.from('   ')).toThrow('PaymentRef cannot be empty');
  });
});

describe('Period', () => {
  const start = DateTime.from('2025-06-01T00:00:00Z');
  const end = DateTime.from('2025-07-01T00:00:00Z');

  it('should create a valid period', () => {
    const period = new Period(start, end);
    expect(period.startedAt.equals(start)).toBe(true);
    expect(period.endsAt.equals(end)).toBe(true);
  });

  it('should throw if endsAt is not after startedAt', () => {
    expect(() => new Period(end, start)).toThrow('Period endsAt must be after startedAt');
  });

  it('should throw if endsAt equals startedAt', () => {
    expect(() => new Period(start, start)).toThrow('Period endsAt must be after startedAt');
  });

  describe('contains', () => {
    const period = new Period(start, end);

    it('should return true for date at start', () => {
      expect(period.contains(start)).toBe(true);
    });

    it('should return true for date in the middle', () => {
      expect(period.contains(start.plusDays(15))).toBe(true);
    });

    it('should return false for date at end (exclusive)', () => {
      expect(period.contains(end)).toBe(false);
    });

    it('should return false for date before start', () => {
      expect(period.contains(start.plusDays(-1))).toBe(false);
    });

    it('should return false for date after end', () => {
      expect(period.contains(end.plusDays(1))).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal periods', () => {
      const a = new Period(start, end);
      const b = new Period(start, end);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different periods', () => {
      const a = new Period(start, end);
      const b = new Period(start, end.plusDays(1));
      expect(a.equals(b)).toBe(false);
    });
  });
});

describe('PlanLimits', () => {
  it('should report unlimited for null fields', () => {
    const limits = new PlanLimits({
      maxBranches: null,
      maxMasters: null,
      maxAppointmentsPerMonth: null,
    });
    expect(limits.isUnlimited('branches')).toBe(true);
    expect(limits.isUnlimited('masters')).toBe(true);
    expect(limits.isUnlimited('appointments')).toBe(true);
  });

  it('should report not unlimited for numeric fields', () => {
    const limits = new PlanLimits({ maxBranches: 1, maxMasters: 3, maxAppointmentsPerMonth: 200 });
    expect(limits.isUnlimited('branches')).toBe(false);
    expect(limits.isUnlimited('masters')).toBe(false);
    expect(limits.isUnlimited('appointments')).toBe(false);
  });

  it('should return correct limit via getLimit', () => {
    const limits = new PlanLimits({ maxBranches: 1, maxMasters: 3, maxAppointmentsPerMonth: 200 });
    expect(limits.getLimit('branches')).toBe(1);
    expect(limits.getLimit('masters')).toBe(3);
    expect(limits.getLimit('appointments')).toBe(200);
  });

  describe('equals', () => {
    it('should return true for same limits', () => {
      const a = new PlanLimits({ maxBranches: 1, maxMasters: 3, maxAppointmentsPerMonth: 200 });
      const b = new PlanLimits({ maxBranches: 1, maxMasters: 3, maxAppointmentsPerMonth: 200 });
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different limits', () => {
      const a = new PlanLimits({ maxBranches: 1, maxMasters: 3, maxAppointmentsPerMonth: 200 });
      const b = new PlanLimits({ maxBranches: 2, maxMasters: 3, maxAppointmentsPerMonth: 200 });
      expect(a.equals(b)).toBe(false);
    });
  });
});
