import { Money } from '@det/backend-shared-ddd';

import { Plan } from './plan';
import { PlanCode } from '../value-objects/plan-code';

describe('Plan', () => {
  describe('byCode', () => {
    it('should return STARTER plan with correct limits', () => {
      const plan = Plan.byCode(PlanCode.STARTER);

      expect(plan.code).toBe(PlanCode.STARTER);
      expect(plan.name).toBe('Starter');
      expect(plan.pricePerMonth.equals(Money.rub(2990))).toBe(true);
      expect(plan.limits.maxBranches).toBe(1);
      expect(plan.limits.maxMasters).toBe(3);
      expect(plan.limits.maxAppointmentsPerMonth).toBe(200);
    });

    it('should return STANDARD plan with correct limits', () => {
      const plan = Plan.byCode(PlanCode.STANDARD);

      expect(plan.code).toBe(PlanCode.STANDARD);
      expect(plan.name).toBe('Standard');
      expect(plan.pricePerMonth.equals(Money.rub(5990))).toBe(true);
      expect(plan.limits.maxBranches).toBe(3);
      expect(plan.limits.maxMasters).toBe(10);
      expect(plan.limits.maxAppointmentsPerMonth).toBe(1000);
    });

    it('should return PRO plan with unlimited limits', () => {
      const plan = Plan.byCode(PlanCode.PRO);

      expect(plan.code).toBe(PlanCode.PRO);
      expect(plan.name).toBe('Pro');
      expect(plan.pricePerMonth.equals(Money.rub(11990))).toBe(true);
      expect(plan.limits.maxBranches).toBeNull();
      expect(plan.limits.maxMasters).toBeNull();
      expect(plan.limits.maxAppointmentsPerMonth).toBeNull();
    });

    it('should return same instance for same code', () => {
      expect(Plan.byCode(PlanCode.STARTER)).toBe(Plan.byCode(PlanCode.STARTER));
    });

    it('should throw for unknown plan code', () => {
      expect(() => Plan.byCode('UNKNOWN' as PlanCode)).toThrow('Unknown plan code: UNKNOWN');
    });
  });

  describe('allActive', () => {
    it('should return all 3 plans', () => {
      const plans = Plan.allActive();

      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.code)).toEqual(
        expect.arrayContaining([PlanCode.STARTER, PlanCode.STANDARD, PlanCode.PRO]),
      );
    });
  });

  describe('PlanLimits.isUnlimited', () => {
    it('should return false for STARTER branches', () => {
      const plan = Plan.byCode(PlanCode.STARTER);
      expect(plan.limits.isUnlimited('branches')).toBe(false);
    });

    it('should return true for PRO branches', () => {
      const plan = Plan.byCode(PlanCode.PRO);
      expect(plan.limits.isUnlimited('branches')).toBe(true);
    });

    it('should return true for PRO masters', () => {
      const plan = Plan.byCode(PlanCode.PRO);
      expect(plan.limits.isUnlimited('masters')).toBe(true);
    });

    it('should return true for PRO appointments', () => {
      const plan = Plan.byCode(PlanCode.PRO);
      expect(plan.limits.isUnlimited('appointments')).toBe(true);
    });
  });
});
