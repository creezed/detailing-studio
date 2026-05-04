import { DateTime } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';
import { BranchId } from '@det/shared/types';

import { Email } from './email.value-object';
import { InvitationStatus } from './invitation-status';
import { InvitationToken } from './invitation-token.value-object';
import { Invitation } from './invitation.aggregate';
import {
  InvitationAlreadyAcceptedError,
  InvitationAlreadyRevokedError,
  InvitationExpiredError,
  InvalidInvitationTokenError,
} from './invitation.errors';
import {
  InvitationAccepted,
  InvitationExpired,
  InvitationIssued,
  InvitationRevoked,
} from './invitation.events';
import { Role } from './role';
import { UserId } from './user-id';

const INVITATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ISSUER_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '33333333-3333-4333-8333-333333333333';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const LATER = DateTime.from('2026-01-02T10:00:00.000Z');
const MUCH_LATER = DateTime.from('2026-01-05T10:00:00.000Z');

function fixedIdGen(): IIdGenerator {
  return {
    generate: () => INVITATION_ID,
  };
}

function sha256(input: string): string {
  return `sha256:${input}`;
}

function pendingInvitation(overrides?: { expiresAt?: DateTime }): Invitation {
  return Invitation.issue({
    branchIds: [BranchId.from(BRANCH_ID)],
    email: Email.from('master@example.com'),
    expiresAt: overrides?.expiresAt,
    idGen: fixedIdGen(),
    issuerId: UserId.from(ISSUER_ID),
    now: NOW,
    role: Role.MASTER,
    token: InvitationToken.fromRaw('secret-token', sha256),
  });
}

describe('Invitation', () => {
  it('issue creates a PENDING invitation with correct expiresAt', () => {
    const invitation = pendingInvitation();

    expect(invitation.toSnapshot()).toMatchObject({
      email: 'master@example.com',
      id: INVITATION_ID,
      invitedBy: ISSUER_ID,
      role: Role.MASTER,
      status: InvitationStatus.PENDING,
    });
    expect(invitation.toSnapshot().expiresAt).toBe(DateTime.from('2026-01-04T10:00:00.000Z').iso());
  });

  it('issue publishes InvitationIssued', () => {
    const invitation = pendingInvitation();
    const events = invitation.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(InvitationIssued);
  });

  it('accept with correct token transitions to ACCEPTED', () => {
    const invitation = pendingInvitation();
    invitation.pullDomainEvents();

    invitation.accept('secret-token', LATER);

    expect(invitation.toSnapshot().status).toBe(InvitationStatus.ACCEPTED);
    expect(invitation.pullDomainEvents()[0]).toBeInstanceOf(InvitationAccepted);
  });

  it('accept with wrong token throws InvalidInvitationTokenError', () => {
    const invitation = pendingInvitation();

    expect(() => {
      invitation.accept('wrong-token', LATER);
    }).toThrow(InvalidInvitationTokenError);
  });

  it('accept after expiry throws InvitationExpiredError', () => {
    const invitation = pendingInvitation();

    expect(() => {
      invitation.accept('secret-token', MUCH_LATER);
    }).toThrow(InvitationExpiredError);
  });

  it('accept already accepted throws InvitationAlreadyAcceptedError', () => {
    const invitation = pendingInvitation();
    invitation.accept('secret-token', LATER);

    expect(() => {
      invitation.accept('secret-token', LATER);
    }).toThrow(InvitationAlreadyAcceptedError);
  });

  it('accept revoked invitation throws InvitationAlreadyAcceptedError', () => {
    const invitation = pendingInvitation();
    invitation.revoke(UserId.from(ISSUER_ID), LATER);

    expect(() => {
      invitation.accept('secret-token', LATER);
    }).toThrow(InvitationAlreadyAcceptedError);
  });

  it('revoke transitions PENDING to REVOKED', () => {
    const invitation = pendingInvitation();
    invitation.pullDomainEvents();

    invitation.revoke(UserId.from(ISSUER_ID), LATER);

    expect(invitation.toSnapshot().status).toBe(InvitationStatus.REVOKED);
    expect(invitation.pullDomainEvents()[0]).toBeInstanceOf(InvitationRevoked);
  });

  it('revoke already accepted throws InvitationAlreadyAcceptedError', () => {
    const invitation = pendingInvitation();
    invitation.accept('secret-token', LATER);

    expect(() => {
      invitation.revoke(UserId.from(ISSUER_ID), LATER);
    }).toThrow(InvitationAlreadyAcceptedError);
  });

  it('revoke already revoked throws InvitationAlreadyRevokedError', () => {
    const invitation = pendingInvitation();
    invitation.revoke(UserId.from(ISSUER_ID), LATER);

    expect(() => {
      invitation.revoke(UserId.from(ISSUER_ID), LATER);
    }).toThrow(InvitationAlreadyRevokedError);
  });

  it('markExpired transitions PENDING to EXPIRED when past expiresAt', () => {
    const invitation = pendingInvitation();
    invitation.pullDomainEvents();

    invitation.markExpired(MUCH_LATER);

    expect(invitation.toSnapshot().status).toBe(InvitationStatus.EXPIRED);
    expect(invitation.pullDomainEvents()[0]).toBeInstanceOf(InvitationExpired);
  });

  it('markExpired does nothing when not yet expired', () => {
    const invitation = pendingInvitation();
    invitation.pullDomainEvents();

    invitation.markExpired(LATER);

    expect(invitation.toSnapshot().status).toBe(InvitationStatus.PENDING);
    expect(invitation.pullDomainEvents()).toEqual([]);
  });

  it('markExpired does nothing for accepted invitation', () => {
    const invitation = pendingInvitation();
    invitation.accept('secret-token', LATER);
    invitation.pullDomainEvents();

    invitation.markExpired(MUCH_LATER);

    expect(invitation.toSnapshot().status).toBe(InvitationStatus.ACCEPTED);
    expect(invitation.pullDomainEvents()).toEqual([]);
  });

  it('isExpired returns true when past expiresAt', () => {
    expect(pendingInvitation().isExpired(MUCH_LATER)).toBe(true);
  });

  it('isExpired returns false when before expiresAt', () => {
    expect(pendingInvitation().isExpired(LATER)).toBe(false);
  });

  it('restore recreates invitation without domain events', () => {
    const restored = Invitation.restore(
      {
        branchIds: [BRANCH_ID],
        email: 'master@example.com',
        expiresAt: NOW.iso(),
        id: INVITATION_ID,
        invitedBy: ISSUER_ID,
        role: Role.MASTER,
        status: InvitationStatus.PENDING,
        tokenHash: 'sha256:secret-token',
      },
      sha256,
    );

    expect(restored.toSnapshot()).toMatchObject({
      id: INVITATION_ID,
      status: InvitationStatus.PENDING,
    });
    expect(restored.pullDomainEvents()).toEqual([]);
  });

  it('InvitationToken.fromRaw stores hash', () => {
    const token = InvitationToken.fromRaw('secret', sha256);

    expect(token.getHash()).toBe('sha256:secret');
    expect(token.verify('secret')).toBe(true);
    expect(token.verify('wrong')).toBe(false);
  });

  it('InvitationToken.fromHash restores and can verify', () => {
    const token = InvitationToken.fromHash('sha256:secret', sha256);

    expect(token.getHash()).toBe('sha256:secret');
    expect(token.verify('secret')).toBe(true);
  });
});
