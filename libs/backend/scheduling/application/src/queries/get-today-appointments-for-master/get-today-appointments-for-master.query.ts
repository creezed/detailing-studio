import type { MasterId } from '@det/backend-scheduling-domain';

export class GetTodayAppointmentsForMasterQuery {
  constructor(
    public readonly masterId: MasterId,
    public readonly date?: string,
  ) {}
}
