import { Money } from '@det/backend-shared-ddd';

import { PlanCode } from '../value-objects/plan-code';
import { PlanLimits } from '../value-objects/plan-limits';

export class Plan {
  private constructor(
    public readonly code: PlanCode,
    public readonly name: string,
    public readonly pricePerMonth: Money,
    public readonly limits: PlanLimits,
  ) {}

  private static readonly REGISTRY: ReadonlyMap<PlanCode, Plan> = new Map<PlanCode, Plan>([
    [
      PlanCode.STARTER,
      new Plan(
        PlanCode.STARTER,
        'Starter',
        Money.rub(2990),
        new PlanLimits({ maxBranches: 1, maxMasters: 3, maxAppointmentsPerMonth: 200 }),
      ),
    ],
    [
      PlanCode.STANDARD,
      new Plan(
        PlanCode.STANDARD,
        'Standard',
        Money.rub(5990),
        new PlanLimits({ maxBranches: 3, maxMasters: 10, maxAppointmentsPerMonth: 1000 }),
      ),
    ],
    [
      PlanCode.PRO,
      new Plan(
        PlanCode.PRO,
        'Pro',
        Money.rub(11990),
        new PlanLimits({ maxBranches: null, maxMasters: null, maxAppointmentsPerMonth: null }),
      ),
    ],
  ]);

  static byCode(code: PlanCode): Plan {
    const plan = Plan.REGISTRY.get(code);

    if (!plan) {
      throw new Error(`Unknown plan code: ${code}`);
    }

    return plan;
  }

  static allActive(): readonly Plan[] {
    return [...Plan.REGISTRY.values()];
  }
}
