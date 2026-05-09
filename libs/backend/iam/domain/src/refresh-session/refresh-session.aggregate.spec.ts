import { DateTime } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';

import { RefreshSessionStatus } from './refresh-session-status';
import { RefreshSession } from './refresh-session.aggregate';
import {
  RefreshSessionCompromised,
  RefreshSessionIssued,
  RefreshSessionRevoked,
  RefreshSessionRotated,
} from './refresh-session.events';
import { SessionId } from './session-id';
import { UserId } from '../user/user-id';

const SESSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_ID = '22222222-2222-4222-8222-222222222222';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const LATER = DateTime.from('2026-01-02T10:00:00.000Z');
const AFTER_DEFAULT_EXPIRY = DateTime.from('2026-02-01T10:00:00.000Z');

function fixedIdGen(): IIdGenerator {
  return {
    generate: () => SESSION_ID,
  };
}

function activeSession(overrides?: { expiresAt?: DateTime }): RefreshSession {
  return RefreshSession.issue({
    expiresAt: overrides?.expiresAt,
    idGen: fixedIdGen(),
    now: NOW,
    tokenHash: 'token-hash-1',
    userId: UserId.from(USER_ID),
  });
}

describe('RefreshSession', () => {
  it('issue creates ACTIVE session with default 30 day expiry', () => {
    const session = activeSession();

    expect(session.toSnapshot()).toMatchObject({
      expiresAt: DateTime.from('2026-01-31T10:00:00.000Z').iso(),
      id: SESSION_ID,
      issuedAt: NOW.iso(),
      status: RefreshSessionStatus.ACTIVE,
      tokenHash: 'token-hash-1',
      userId: USER_ID,
    });
  });

  it('issue accepts explicit expiresAt and publishes RefreshSessionIssued', () => {
    const session = activeSession({ expiresAt: AFTER_DEFAULT_EXPIRY });
    const events = session.pullDomainEvents();

    expect(session.toSnapshot().expiresAt).toBe(AFTER_DEFAULT_EXPIRY.iso());
    expect(events[0]).toBeInstanceOf(RefreshSessionIssued);
  });

  it('rotate updates token hash, records old hash, and publishes RefreshSessionRotated', () => {
    const session = activeSession();
    session.pullDomainEvents();

    session.rotate(LATER, 'token-hash-2');

    expect(session.toSnapshot()).toMatchObject({
      lastRotatedAt: LATER.iso(),
      rotationCounter: 1,
      rotatedTokenHashes: ['token-hash-1'],
      status: RefreshSessionStatus.ACTIVE,
      tokenHash: 'token-hash-2',
    });
    expect(session.pullDomainEvents()[0]).toBeInstanceOf(RefreshSessionRotated);
  });

  it('rotate with same token hash is idempotent', () => {
    const session = activeSession();
    session.pullDomainEvents();

    session.rotate(LATER, 'token-hash-1');

    expect(session.toSnapshot().rotationCounter).toBe(0);
    expect(session.pullDomainEvents()).toEqual([]);
  });

  it('revoke transitions active session to REVOKED', () => {
    const session = activeSession();
    session.pullDomainEvents();

    session.revoke(UserId.from(ACTOR_ID), LATER);

    expect(session.toSnapshot()).toMatchObject({
      revokedAt: LATER.iso(),
      revokedBy: ACTOR_ID,
      status: RefreshSessionStatus.REVOKED,
    });
    expect(session.pullDomainEvents()[0]).toBeInstanceOf(RefreshSessionRevoked);
  });

  it('revoke is idempotent for already revoked session', () => {
    const session = activeSession();
    session.revoke(UserId.from(ACTOR_ID), LATER);
    session.pullDomainEvents();

    session.revoke(UserId.from(ACTOR_ID), LATER);

    expect(session.pullDomainEvents()).toEqual([]);
  });

  it('markCompromised transitions session and publishes RefreshSessionCompromised', () => {
    const session = activeSession();
    session.pullDomainEvents();

    session.markCompromised(LATER);

    expect(session.toSnapshot()).toMatchObject({
      compromisedAt: LATER.iso(),
      status: RefreshSessionStatus.COMPROMISED,
    });
    expect(session.pullDomainEvents()[0]).toBeInstanceOf(RefreshSessionCompromised);
  });

  it('markCompromised is idempotent for already compromised session', () => {
    const session = activeSession();
    session.markCompromised(LATER);
    session.pullDomainEvents();

    session.markCompromised(LATER);

    expect(session.pullDomainEvents()).toEqual([]);
  });

  it('rotate does nothing for inactive session', () => {
    const session = activeSession();
    session.revoke(UserId.from(ACTOR_ID), LATER);
    session.pullDomainEvents();

    session.rotate(LATER, 'token-hash-2');

    expect(session.toSnapshot()).toMatchObject({
      rotationCounter: 0,
      tokenHash: 'token-hash-1',
    });
    expect(session.pullDomainEvents()).toEqual([]);
  });

  it('isExpired returns true after expiresAt', () => {
    expect(activeSession().isExpired(AFTER_DEFAULT_EXPIRY)).toBe(true);
  });

  it('isExpired returns false before expiresAt', () => {
    expect(activeSession().isExpired(LATER)).toBe(false);
  });

  it('restore recreates refresh session without domain events', () => {
    const session = RefreshSession.restore({
      compromisedAt: null,
      expiresAt: AFTER_DEFAULT_EXPIRY.iso(),
      id: SESSION_ID,
      issuedAt: NOW.iso(),
      lastRotatedAt: LATER.iso(),
      revokedAt: null,
      revokedBy: null,
      rotatedTokenHashes: ['token-hash-1'],
      rotationCounter: 1,
      status: RefreshSessionStatus.ACTIVE,
      tokenHash: 'token-hash-2',
      userId: USER_ID,
    });

    expect(session.id).toBe(SessionId.from(SESSION_ID));
    expect(session.toSnapshot()).toMatchObject({
      rotatedTokenHashes: ['token-hash-1'],
      rotationCounter: 1,
      tokenHash: 'token-hash-2',
    });
    expect(session.pullDomainEvents()).toEqual([]);
  });
});
