import type { DateTime } from '@det/backend-shared-ddd';

export interface LimitsUsage {
  readonly branchesUsed: number;
  readonly mastersUsed: number;
  readonly appointmentsThisMonthUsed: number;
  readonly periodStart: DateTime;
  readonly periodEnd: DateTime;
}
