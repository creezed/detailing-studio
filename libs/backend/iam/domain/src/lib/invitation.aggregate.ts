import { AggregateRoot, DateTime } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';
import { BranchId } from '@det/shared/types';

import { Email } from './email.value-object';
import { InvitationId } from './invitation-id';
import { InvitationStatus } from './invitation-status';
import { InvitationToken } from './invitation-token.value-object';
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
import { UserId } from './user-id';

import type { Role } from './role';

const DEFAULT_INVITATION_HOURS = 72;

export interface IssueInvitationProps {
  readonly issuerId: UserId;
  readonly email: Email;
  readonly role: Role;
  readonly branchIds: readonly BranchId[];
  readonly expiresAt?: DateTime;
  readonly token: InvitationToken;
  readonly now: DateTime;
  readonly idGen: IIdGenerator;
}

export interface InvitationSnapshot {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly branchIds: readonly string[];
  readonly tokenHash: string;
  readonly status: InvitationStatus;
  readonly expiresAt: string;
  readonly invitedBy: string;
}

export class Invitation extends AggregateRoot<InvitationId> {
  private constructor(
    private readonly _id: InvitationId,
    private readonly _email: Email,
    private readonly _role: Role,
    private readonly _branchIds: Set<BranchId>,
    private readonly _token: InvitationToken,
    private _status: InvitationStatus,
    private readonly _expiresAt: DateTime,
    private readonly _invitedBy: UserId,
  ) {
    super();
  }

  override get id(): InvitationId {
    return this._id;
  }

  static issue(props: IssueInvitationProps): Invitation {
    const expiresAt =
      props.expiresAt ??
      DateTime.from(props.now.toDate().getTime() + DEFAULT_INVITATION_HOURS * 60 * 60 * 1000);

    const invitation = new Invitation(
      InvitationId.generate(props.idGen),
      props.email,
      props.role,
      new Set(props.branchIds),
      props.token,
      InvitationStatus.PENDING,
      expiresAt,
      props.issuerId,
    );

    invitation.addEvent(
      new InvitationIssued(
        invitation.id,
        invitation._email,
        invitation._role,
        invitation._invitedBy,
        invitation._status,
        props.now,
      ),
    );

    return invitation;
  }

  static restore(snapshot: InvitationSnapshot, hashFn: (s: string) => string): Invitation {
    return new Invitation(
      InvitationId.from(snapshot.id),
      Email.from(snapshot.email),
      snapshot.role,
      new Set(snapshot.branchIds.map((branchId) => BranchId.from(branchId))),
      InvitationToken.fromHash(snapshot.tokenHash, hashFn),
      snapshot.status,
      DateTime.from(snapshot.expiresAt),
      UserId.from(snapshot.invitedBy),
    );
  }

  accept(rawToken: string, now: DateTime): void {
    if (this._status === InvitationStatus.ACCEPTED) {
      throw new InvitationAlreadyAcceptedError(this.id);
    }

    if (this._status !== InvitationStatus.PENDING) {
      throw new InvitationAlreadyAcceptedError(this.id);
    }

    if (this.isExpired(now)) {
      throw new InvitationExpiredError(this.id);
    }

    if (!this._token.verify(rawToken)) {
      throw new InvalidInvitationTokenError();
    }

    this._status = InvitationStatus.ACCEPTED;
    this.addEvent(new InvitationAccepted(this.id, now));
  }

  revoke(by: UserId, now: DateTime): void {
    if (this._status === InvitationStatus.ACCEPTED) {
      throw new InvitationAlreadyAcceptedError(this.id);
    }

    if (this._status === InvitationStatus.REVOKED) {
      throw new InvitationAlreadyRevokedError(this.id);
    }

    this._status = InvitationStatus.REVOKED;
    this.addEvent(new InvitationRevoked(this.id, by, now));
  }

  markExpired(now: DateTime): void {
    if (this._status !== InvitationStatus.PENDING) {
      return;
    }

    if (!this.isExpired(now)) {
      return;
    }

    this._status = InvitationStatus.EXPIRED;
    this.addEvent(new InvitationExpired(this.id, now));
  }

  isExpired(now: DateTime): boolean {
    return now.toDate() > this._expiresAt.toDate();
  }

  toSnapshot(): InvitationSnapshot {
    return {
      branchIds: [...this._branchIds],
      email: this._email.getValue(),
      expiresAt: this._expiresAt.iso(),
      id: this.id,
      invitedBy: this._invitedBy,
      role: this._role,
      status: this._status,
      tokenHash: this._token.getHash(),
    };
  }
}
