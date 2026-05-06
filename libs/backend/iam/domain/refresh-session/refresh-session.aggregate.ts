import { AggregateRoot, DateTime } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';

import { RefreshSessionStatus } from './refresh-session-status';
import {
  RefreshSessionCompromised,
  RefreshSessionIssued,
  RefreshSessionRevoked,
  RefreshSessionRotated,
} from './refresh-session.events';
import { SessionId } from './session-id';
import { UserId } from '../user/user-id';

const DEFAULT_REFRESH_SESSION_DAYS = 30;

export interface IssueRefreshSessionProps {
  readonly userId: UserId;
  readonly deviceFingerprint: string;
  readonly expiresAt?: DateTime;
  readonly tokenHash: string;
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface RefreshSessionSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly deviceFingerprint: string;
  readonly tokenHash: string;
  readonly rotatedTokenHashes: readonly string[];
  readonly rotationCounter: number;
  readonly status: RefreshSessionStatus;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly lastRotatedAt: string | null;
  readonly revokedAt: string | null;
  readonly revokedBy: string | null;
  readonly compromisedAt: string | null;
}

export class RefreshSession extends AggregateRoot<SessionId> {
  private constructor(
    private readonly _id: SessionId,
    private readonly _userId: UserId,
    private readonly _deviceFingerprint: string,
    private _tokenHash: string,
    private readonly _rotatedTokenHashes: string[],
    private _rotationCounter: number,
    private _status: RefreshSessionStatus,
    private readonly _issuedAt: DateTime,
    private readonly _expiresAt: DateTime,
    private _lastRotatedAt: DateTime | null,
    private _revokedAt: DateTime | null,
    private _revokedBy: UserId | null,
    private _compromisedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): SessionId {
    return this._id;
  }

  static issue(props: IssueRefreshSessionProps): RefreshSession {
    const expiresAt =
      props.expiresAt ??
      DateTime.from(
        props.now.toDate().getTime() + DEFAULT_REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000,
      );

    const session = new RefreshSession(
      SessionId.generate(props.idGen),
      props.userId,
      props.deviceFingerprint,
      props.tokenHash,
      [],
      0,
      RefreshSessionStatus.ACTIVE,
      props.now,
      expiresAt,
      null,
      null,
      null,
      null,
    );

    session.addEvent(new RefreshSessionIssued(session.id, session._userId, props.now));

    return session;
  }

  static restore(snapshot: RefreshSessionSnapshot): RefreshSession {
    return new RefreshSession(
      SessionId.from(snapshot.id),
      UserId.from(snapshot.userId),
      snapshot.deviceFingerprint,
      snapshot.tokenHash,
      [...snapshot.rotatedTokenHashes],
      snapshot.rotationCounter,
      snapshot.status,
      DateTime.from(snapshot.issuedAt),
      DateTime.from(snapshot.expiresAt),
      snapshot.lastRotatedAt === null ? null : DateTime.from(snapshot.lastRotatedAt),
      snapshot.revokedAt === null ? null : DateTime.from(snapshot.revokedAt),
      snapshot.revokedBy === null ? null : UserId.from(snapshot.revokedBy),
      snapshot.compromisedAt === null ? null : DateTime.from(snapshot.compromisedAt),
    );
  }

  rotate(now: DateTime, newTokenHash: string): void {
    if (this._status !== RefreshSessionStatus.ACTIVE) {
      return;
    }

    if (this._tokenHash === newTokenHash) {
      return;
    }

    const previousTokenHash = this._tokenHash;
    this._rotatedTokenHashes.push(previousTokenHash);
    this._tokenHash = newTokenHash;
    this._rotationCounter += 1;
    this._lastRotatedAt = now;
    this.addEvent(new RefreshSessionRotated(this.id, previousTokenHash, newTokenHash, now));
  }

  revoke(by: UserId, now: DateTime): void {
    if (this._status === RefreshSessionStatus.REVOKED) {
      return;
    }

    this._status = RefreshSessionStatus.REVOKED;
    this._revokedAt = now;
    this._revokedBy = by;
    this.addEvent(new RefreshSessionRevoked(this.id, by, now));
  }

  markCompromised(now: DateTime): void {
    if (this._status === RefreshSessionStatus.COMPROMISED) {
      return;
    }

    this._status = RefreshSessionStatus.COMPROMISED;
    this._compromisedAt = now;
    this.addEvent(new RefreshSessionCompromised(this.id, now));
  }

  isExpired(now: DateTime): boolean {
    return now.toDate().getTime() > this._expiresAt.toDate().getTime();
  }

  toSnapshot(): RefreshSessionSnapshot {
    return {
      compromisedAt: this._compromisedAt?.iso() ?? null,
      deviceFingerprint: this._deviceFingerprint,
      expiresAt: this._expiresAt.iso(),
      id: this.id,
      issuedAt: this._issuedAt.iso(),
      lastRotatedAt: this._lastRotatedAt?.iso() ?? null,
      revokedAt: this._revokedAt?.iso() ?? null,
      revokedBy: this._revokedBy,
      rotatedTokenHashes: [...this._rotatedTokenHashes],
      rotationCounter: this._rotationCounter,
      status: this._status,
      tokenHash: this._tokenHash,
      userId: this._userId,
    };
  }
}
