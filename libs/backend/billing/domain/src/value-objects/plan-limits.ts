import { ValueObject } from '@det/backend-shared-ddd';

export type LimitField = 'branches' | 'masters' | 'appointments';

export interface PlanLimitsProps {
  readonly maxBranches: number | null;
  readonly maxMasters: number | null;
  readonly maxAppointmentsPerMonth: number | null;
}

export class PlanLimits extends ValueObject {
  readonly maxBranches: number | null;
  readonly maxMasters: number | null;
  readonly maxAppointmentsPerMonth: number | null;

  constructor(props: PlanLimitsProps) {
    super();
    this.maxBranches = props.maxBranches;
    this.maxMasters = props.maxMasters;
    this.maxAppointmentsPerMonth = props.maxAppointmentsPerMonth;
  }

  isUnlimited(field: LimitField): boolean {
    return this.getLimit(field) === null;
  }

  getLimit(field: LimitField): number | null {
    switch (field) {
      case 'branches':
        return this.maxBranches;
      case 'masters':
        return this.maxMasters;
      case 'appointments':
        return this.maxAppointmentsPerMonth;
    }
  }

  override equals(other: this): boolean {
    return (
      this.maxBranches === other.maxBranches &&
      this.maxMasters === other.maxMasters &&
      this.maxAppointmentsPerMonth === other.maxAppointmentsPerMonth
    );
  }
}
