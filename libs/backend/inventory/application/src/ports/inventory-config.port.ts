import type { Money } from '@det/backend-shared-ddd';

export interface IInventoryConfigPort {
  adjustmentAutoApprovalThreshold(): Money;
}
