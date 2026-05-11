import type { BayId } from '@det/backend-scheduling-domain';

export interface IBayUsagePort {
  hasFutureAppointments(bayId: BayId): Promise<boolean>;
}
