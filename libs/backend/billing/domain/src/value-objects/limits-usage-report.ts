import type { PlanCode } from './plan-code';
import type { LimitField } from './plan-limits';

export type LimitItemStatus = 'OK' | 'WARNING' | 'EXCEEDED';

export interface LimitsUsageReportItem {
  readonly field: LimitField;
  readonly used: number;
  readonly limit: number | null;
  readonly percent: number;
  readonly status: LimitItemStatus;
}

export interface LimitsUsageReport {
  readonly plan: PlanCode;
  readonly status: LimitItemStatus;
  readonly items: readonly LimitsUsageReportItem[];
}
