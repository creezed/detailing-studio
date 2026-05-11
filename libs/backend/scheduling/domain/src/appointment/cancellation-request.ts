import type { DateTime } from '@det/backend-shared-ddd';

import type { CancellationRequestId } from '../value-objects/cancellation-request-id';

export enum CancellationRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface CancellationRequest {
  readonly id: CancellationRequestId;
  readonly requestedAt: DateTime;
  readonly requestedBy: string;
  readonly reason: string;
  status: CancellationRequestStatus;
  decidedAt: DateTime | null;
  decidedBy: string | null;
  decisionReason: string | null;
}
