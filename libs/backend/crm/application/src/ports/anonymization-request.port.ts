export const ANONYMIZATION_REQUEST_PORT = Symbol('ANONYMIZATION_REQUEST_PORT');

export type AnonymizationRequestStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface AnonymizationRequest {
  readonly id: string;
  readonly clientId: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly requestedAt: string;
  readonly dueBy: string;
  readonly status: AnonymizationRequestStatus;
  readonly completedBy: string | null;
  readonly completedAt: string | null;
  readonly cancelledBy: string | null;
  readonly cancelledAt: string | null;
  readonly cancelReason: string | null;
}

export interface IAnonymizationRequestPort {
  create(request: AnonymizationRequest): Promise<void>;
  findById(id: string): Promise<AnonymizationRequest | null>;
  findPendingByClientId(clientId: string): Promise<AnonymizationRequest | null>;
  markCompleted(id: string, completedBy: string, completedAt: string): Promise<void>;
  markCancelled(
    id: string,
    cancelledBy: string,
    cancelledAt: string,
    reason: string,
  ): Promise<void>;
}
