import type { InvitationId } from './invitation-id';
import type { InvitationStatus } from './invitation-status';
import type { Invitation } from './invitation.aggregate';
import type { Email } from '../shared/email.value-object';

export interface IInvitationRepository {
  findById(id: InvitationId): Promise<Invitation | null>;
  findByRawToken(rawToken: string): Promise<Invitation | null>;
  findByEmailAndStatus(email: Email, status: InvitationStatus): Promise<Invitation | null>;
  save(invitation: Invitation): Promise<void>;
}
