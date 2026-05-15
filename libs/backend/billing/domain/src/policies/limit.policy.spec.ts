import { DateTime } from '@det/backend-shared-ddd';

import { evaluateLimits } from './limit.policy';
import { PlanCode } from '../value-objects/plan-code';

import type { LimitsUsage } from '../value-objects/limits-usage';

const PERIOD_START = DateTime.from('2025-06-01T00:00:00Z');
const PERIOD_END = DateTime.from('2025-07-01T00:00:00Z');

function usage(overrides: Partial<LimitsUsage> = {}): LimitsUsage {
  return {
    branchesUsed: 0,
    mastersUsed: 0,
    appointmentsThisMonthUsed: 0,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    ...overrides,
  };
}

describe('evaluateLimits', () => {
  describe('STARTER plan (limits: 1/3/200)', () => {
    it('should return OK when at exact limits', () => {
      const report = evaluateLimits(
        PlanCode.STARTER,
        usage({
          branchesUsed: 1,
          mastersUsed: 3,
          appointmentsThisMonthUsed: 200,
        }),
      );

      expect(report.status).toBe('OK');
      expect(report.plan).toBe(PlanCode.STARTER);
      expect(report.items).toHaveLength(3);

      for (const item of report.items) {
        expect(item.percent).toBeLessThanOrEqual(1);
      }
    });

    it('should return WARNING when appointments >= 80% (161/200)', () => {
      const report = evaluateLimits(
        PlanCode.STARTER,
        usage({
          branchesUsed: 1,
          mastersUsed: 2,
          appointmentsThisMonthUsed: 161,
        }),
      );

      expect(report.status).toBe('WARNING');

      const apptItem = report.items.find((i) => i.field === 'appointments');
      expect(apptItem).toBeDefined();
      expect(apptItem?.status).toBe('WARNING');
      expect(apptItem?.percent).toBeGreaterThanOrEqual(0.8);
    });

    it('should return WARNING when masters at 80% (3/3 = 100% but <=limit)', () => {
      const report = evaluateLimits(
        PlanCode.STARTER,
        usage({
          branchesUsed: 0,
          mastersUsed: 3,
          appointmentsThisMonthUsed: 0,
        }),
      );

      const mastersItem = report.items.find((i) => i.field === 'masters');
      expect(mastersItem).toBeDefined();
      expect(mastersItem?.percent).toBe(1);
      expect(mastersItem?.status).toBe('OK');
    });

    it('should return EXCEEDED when branches exceed limit', () => {
      const report = evaluateLimits(
        PlanCode.STARTER,
        usage({
          branchesUsed: 2,
          mastersUsed: 3,
          appointmentsThisMonthUsed: 200,
        }),
      );

      expect(report.status).toBe('EXCEEDED');

      const branchItem = report.items.find((i) => i.field === 'branches');
      expect(branchItem).toBeDefined();
      expect(branchItem?.status).toBe('EXCEEDED');
      expect(branchItem?.used).toBe(2);
      expect(branchItem?.limit).toBe(1);
    });

    it('should return EXCEEDED when appointments exceed limit', () => {
      const report = evaluateLimits(
        PlanCode.STARTER,
        usage({
          branchesUsed: 1,
          mastersUsed: 3,
          appointmentsThisMonthUsed: 201,
        }),
      );

      expect(report.status).toBe('EXCEEDED');

      const apptItem = report.items.find((i) => i.field === 'appointments');
      expect(apptItem).toBeDefined();
      expect(apptItem?.status).toBe('EXCEEDED');
    });

    it('should return OK when usage is zero', () => {
      const report = evaluateLimits(PlanCode.STARTER, usage());

      expect(report.status).toBe('OK');

      for (const item of report.items) {
        expect(item.status).toBe('OK');
      }
    });
  });

  describe('STANDARD plan (limits: 3/10/1000)', () => {
    it('should return WARNING when masters at 80%', () => {
      const report = evaluateLimits(
        PlanCode.STANDARD,
        usage({
          branchesUsed: 1,
          mastersUsed: 8,
          appointmentsThisMonthUsed: 100,
        }),
      );

      expect(report.status).toBe('WARNING');

      const mastersItem = report.items.find((i) => i.field === 'masters');
      expect(mastersItem).toBeDefined();
      expect(mastersItem?.status).toBe('WARNING');
      expect(mastersItem?.percent).toBe(0.8);
    });
  });

  describe('PRO plan (all limits null = unlimited)', () => {
    it('should always return OK regardless of usage', () => {
      const report = evaluateLimits(
        PlanCode.PRO,
        usage({
          branchesUsed: 100,
          mastersUsed: 500,
          appointmentsThisMonthUsed: 100000,
        }),
      );

      expect(report.status).toBe('OK');
      expect(report.plan).toBe(PlanCode.PRO);

      for (const item of report.items) {
        expect(item.status).toBe('OK');
        expect(item.limit).toBeNull();
        expect(item.percent).toBe(0);
      }
    });
  });

  describe('STARTER — exactly at 80% threshold', () => {
    it('should return WARNING for masters at 80% (but not exact limit)', () => {
      const report = evaluateLimits(
        PlanCode.STANDARD,
        usage({
          mastersUsed: 8,
        }),
      );

      const mastersItem = report.items.find((i) => i.field === 'masters');
      expect(mastersItem).toBeDefined();
      expect(mastersItem?.status).toBe('WARNING');
      expect(mastersItem?.percent).toBe(0.8);
    });

    it('should return OK for masters at 79%', () => {
      const report = evaluateLimits(
        PlanCode.STANDARD,
        usage({
          mastersUsed: 7,
        }),
      );

      const mastersItem = report.items.find((i) => i.field === 'masters');
      expect(mastersItem).toBeDefined();
      expect(mastersItem?.status).toBe('OK');
      expect(mastersItem?.percent).toBe(0.7);
    });
  });

  describe('aggregate status', () => {
    it('should pick highest severity across items', () => {
      const report = evaluateLimits(
        PlanCode.STARTER,
        usage({
          branchesUsed: 2,
          mastersUsed: 1,
          appointmentsThisMonthUsed: 161,
        }),
      );

      expect(report.status).toBe('EXCEEDED');

      const branchItem = report.items.find((i) => i.field === 'branches');
      expect(branchItem?.status).toBe('EXCEEDED');

      const apptItem = report.items.find((i) => i.field === 'appointments');
      expect(apptItem?.status).toBe('WARNING');

      const mastersItem = report.items.find((i) => i.field === 'masters');
      expect(mastersItem?.status).toBe('OK');
    });
  });
});
