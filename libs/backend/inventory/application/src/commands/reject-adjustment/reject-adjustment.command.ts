import type { AdjustmentId } from '@det/backend-inventory-domain';
import type { UserId } from '@det/shared-types';

export class RejectAdjustmentCommand {
  constructor(
    public readonly adjustmentId: AdjustmentId,
    public readonly rejectedBy: UserId,
    public readonly reason: string,
  ) {}
}
