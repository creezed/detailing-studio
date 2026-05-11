import type { BranchId, MasterId } from '@det/backend-scheduling-domain';
import type { DateTime } from '@det/backend-shared-ddd';

export class AddMasterUnavailabilityCommand {
  constructor(
    public readonly masterId: MasterId,
    public readonly branchId: BranchId,
    public readonly fromAt: DateTime,
    public readonly toAt: DateTime,
    public readonly reason: string,
  ) {}
}
