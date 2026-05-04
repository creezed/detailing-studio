import type { Email } from './email.value-object';
import type { InvitationId } from './invitation-id';
import type { InvitationStatus } from './invitation-status';
import type { Invitation } from './invitation.aggregate';

export interface IInvitationRepository {
  findById(id: InvitationId): Promise<Invitation | null>;
  findByEmailAndStatus(email: Email, status: InvitationStatus): Promise<Invitation | null>;
  save(invitation: Invitation): Promise<void>;
}
