import type { BranchId } from '@det/backend-scheduling-domain';

export class CreateBayCommand {
  constructor(
    public readonly branchId: BranchId,
    public readonly name: string,
  ) {}
}
