import { Plan } from '../plan/plan';

import type { LimitsUsage } from '../value-objects/limits-usage';
import type {
  LimitItemStatus,
  LimitsUsageReport,
  LimitsUsageReportItem,
} from '../value-objects/limits-usage-report';
import type { PlanCode } from '../value-objects/plan-code';
import type { LimitField } from '../value-objects/plan-limits';

const FIELDS: readonly LimitField[] = ['branches', 'masters', 'appointments'] as const;

const SEVERITY: Record<LimitItemStatus, number> = {
  OK: 0,
  WARNING: 1,
  EXCEEDED: 2,
};

function usageForField(field: LimitField, usage: LimitsUsage): number {
  switch (field) {
    case 'branches':
      return usage.branchesUsed;
    case 'masters':
      return usage.mastersUsed;
    case 'appointments':
      return usage.appointmentsThisMonthUsed;
  }
}

function evaluateItem(
  field: LimitField,
  used: number,
  limit: number | null,
): LimitsUsageReportItem {
  if (limit === null) {
    return { field, used, limit, percent: 0, status: 'OK' };
  }

  const percent = limit === 0 ? (used > 0 ? Infinity : 0) : used / limit;
  let status: LimitItemStatus;

  if (used > limit) {
    status = 'EXCEEDED';
  } else if (percent >= 0.8 && used < limit) {
    status = 'WARNING';
  } else {
    status = 'OK';
  }

  return { field, used, limit, percent, status };
}

export function evaluateLimits(planCode: PlanCode, usage: LimitsUsage): LimitsUsageReport {
  const plan = Plan.byCode(planCode);
  const items = FIELDS.map((field) => {
    const limit = plan.limits.getLimit(field);
    const used = usageForField(field, usage);

    return evaluateItem(field, used, limit);
  });

  let aggregateStatus: LimitItemStatus = 'OK';

  for (const item of items) {
    if (SEVERITY[item.status] > SEVERITY[aggregateStatus]) {
      aggregateStatus = item.status;
    }
  }

  return { plan: planCode, status: aggregateStatus, items };
}
