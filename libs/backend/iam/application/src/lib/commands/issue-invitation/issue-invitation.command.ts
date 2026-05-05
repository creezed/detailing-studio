import type { Role, UserId } from '@det/backend/iam/domain';
import type { BranchId } from '@det/shared/types';

export class IssueInvitationCommand {
  constructor(
    public readonly issuerId: UserId,
    public readonly email: string,
    public readonly role: Role,
    public readonly branchIds: readonly BranchId[],
  ) {}
}
