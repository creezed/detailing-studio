import type { BranchId, MasterId, UnavailabilityId } from '@det/backend-scheduling-domain';

export class RemoveMasterUnavailabilityCommand {
  constructor(
    public readonly masterId: MasterId,
    public readonly branchId: BranchId,
    public readonly unavailabilityId: UnavailabilityId,
  ) {}
}
