import { DateTime, PhoneNumber } from '@det/backend-shared-ddd';
import type { IIdGenerator } from '@det/backend-shared-ddd';
import { BranchId } from '@det/shared-types';

import { UserId } from './user-id';
import { UserStatus } from './user-status';
import { User } from './user.aggregate';
import {
  CannotArchiveLastOwnerError,
  InvalidEmailError,
  InvalidPhoneError,
  UserAlreadyBlockedError,
  UserNotActiveError,
} from './user.errors';
import {
  UserArchived,
  UserBlocked,
  UserPasswordChanged,
  UserRegistered,
  UserUnblocked,
} from './user.events';
import { Email } from '../shared/email.value-object';
import { PasswordHash } from '../shared/password-hash.value-object';
import { Role } from '../shared/role';

class FixedIdGenerator implements IIdGenerator {
  private currentIndex = 0;

  constructor(private readonly values: readonly string[]) {}

  generate(): string {
    const value = this.values[this.currentIndex];

    if (value === undefined) {
      throw new Error('No generated id configured for test');
    }

    this.currentIndex += 1;

    return value;
  }
}

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_ID = '22222222-2222-4222-8222-222222222222';
const BRANCH_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_BRANCH_ID = '44444444-4444-4444-8444-444444444444';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const LATER = DateTime.from('2026-01-02T10:00:00.000Z');

function idGen(): IIdGenerator {
  return new FixedIdGenerator([USER_ID]);
}

function activeOwner(): User {
  return User.register({
    branchIds: [],
    email: Email.from('owner@example.com'),
    fullName: 'Owner User',
    idGen: idGen(),
    now: NOW,
    passwordHash: PasswordHash.fromHash('hash-1'),
    phone: PhoneNumber.from('+79990000001'),
    role: Role.OWNER,
  });
}

describe('User', () => {
  it('register creates an active owner user', () => {
    const user = activeOwner();

    expect(user.toSnapshot()).toMatchObject({
      email: 'owner@example.com',
      fullName: 'Owner User',
      id: USER_ID,
      passwordHash: 'hash-1',
      phone: '+79990000001',
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
    });
    expect(user.hasRole(Role.OWNER)).toBe(true);
  });

  it('register accepts string email and phone', () => {
    const user = User.register({
      branchIds: [],
      email: 'client@example.com',
      fullName: 'Client User',
      idGen: idGen(),
      now: NOW,
      passwordHash: null,
      phone: '+79990000004',
      role: Role.CLIENT,
    });

    expect(user.toSnapshot()).toMatchObject({
      email: 'client@example.com',
      phone: '+79990000004',
      status: UserStatus.ACTIVE,
    });
  });

  it('register creates a pending staff user', () => {
    const user = User.register({
      branchIds: [BranchId.from(BRANCH_ID)],
      email: Email.from('manager@example.com'),
      fullName: 'Manager User',
      idGen: idGen(),
      now: NOW,
      passwordHash: PasswordHash.fromHash('hash-1'),
      phone: PhoneNumber.from('+79990000002'),
      role: Role.MANAGER,
    });

    expect(user.toSnapshot().status).toBe(UserStatus.PENDING_INVITATION);
  });

  it('activateFromInvitation creates an active user', () => {
    const user = User.activateFromInvitation({
      branchIds: [BranchId.from(BRANCH_ID)],
      email: Email.from('master@example.com'),
      fullName: 'Master User',
      idGen: idGen(),
      now: NOW,
      passwordHash: PasswordHash.fromHash('hash-1'),
      phone: PhoneNumber.from('+79990000003'),
      role: Role.MASTER,
    });

    expect(user.toSnapshot().status).toBe(UserStatus.ACTIVE);
    expect(user.hasRole(Role.MASTER)).toBe(true);
  });

  it('register publishes UserRegistered', () => {
    const user = activeOwner();
    const events = user.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserRegistered);
    expect(events[0]).toMatchObject({
      aggregateId: USER_ID,
      aggregateType: 'User',
      eventType: 'UserRegistered',
    });
  });

  it('changePassword changes hash and publishes UserPasswordChanged', () => {
    const user = activeOwner();
    user.pullDomainEvents();

    user.changePassword(PasswordHash.fromHash('hash-2'), LATER);

    expect(user.toSnapshot().passwordHash).toBe('hash-2');
    expect(user.pullDomainEvents()[0]).toBeInstanceOf(UserPasswordChanged);
  });

  it('block changes active user to blocked and publishes UserBlocked', () => {
    const user = activeOwner();
    user.pullDomainEvents();

    user.block(UserId.from(ACTOR_ID), 'policy violation', LATER);

    expect(user.toSnapshot().status).toBe(UserStatus.BLOCKED);
    expect(user.pullDomainEvents()[0]).toBeInstanceOf(UserBlocked);
  });

  it('block already blocked user throws UserAlreadyBlockedError', () => {
    const user = activeOwner();
    user.block(UserId.from(ACTOR_ID), 'policy violation', LATER);

    expect(() => {
      user.block(UserId.from(ACTOR_ID), 'again', LATER);
    }).toThrow(UserAlreadyBlockedError);
  });

  it('block pending user throws UserNotActiveError', () => {
    const user = User.register({
      branchIds: [BranchId.from(BRANCH_ID)],
      email: Email.from('manager@example.com'),
      fullName: 'Manager User',
      idGen: idGen(),
      now: NOW,
      passwordHash: PasswordHash.fromHash('hash-1'),
      phone: PhoneNumber.from('+79990000002'),
      role: Role.MANAGER,
    });

    expect(() => {
      user.block(UserId.from(ACTOR_ID), 'policy violation', LATER);
    }).toThrow(UserNotActiveError);
  });

  it('unblock changes blocked user to active and publishes UserUnblocked', () => {
    const user = activeOwner();
    user.block(UserId.from(ACTOR_ID), 'policy violation', LATER);
    user.pullDomainEvents();

    user.unblock(UserId.from(ACTOR_ID), LATER);

    expect(user.toSnapshot().status).toBe(UserStatus.ACTIVE);
    expect(user.pullDomainEvents()[0]).toBeInstanceOf(UserUnblocked);
  });

  it('unblock active user throws UserNotActiveError', () => {
    const user = activeOwner();

    expect(() => {
      user.unblock(UserId.from(ACTOR_ID), LATER);
    }).toThrow(UserNotActiveError);
  });

  it('archive last owner throws CannotArchiveLastOwnerError', () => {
    const user = activeOwner();

    expect(() => {
      user.archive(UserId.from(ACTOR_ID), LATER, true);
    }).toThrow(CannotArchiveLastOwnerError);
  });

  it('archive non-last owner changes status and publishes UserArchived', () => {
    const user = activeOwner();
    user.pullDomainEvents();

    user.archive(UserId.from(ACTOR_ID), LATER, false);

    expect(user.toSnapshot().status).toBe(UserStatus.ARCHIVED);
    expect(user.pullDomainEvents()[0]).toBeInstanceOf(UserArchived);
  });

  it('assignToBranch adds branch idempotently', () => {
    const user = activeOwner();
    user.pullDomainEvents();

    user.assignToBranch(BranchId.from(BRANCH_ID), LATER);
    user.assignToBranch(BranchId.from(BRANCH_ID), LATER);
    user.assignToBranch(BranchId.from(SECOND_BRANCH_ID), LATER);

    expect(user.toSnapshot().branchIds).toEqual([BRANCH_ID, SECOND_BRANCH_ID]);
    expect(user.canAccessBranch(BranchId.from(BRANCH_ID))).toBe(true);
  });

  it('removeFromBranch removes branch idempotently', () => {
    const user = activeOwner();

    user.assignToBranch(BranchId.from(BRANCH_ID), LATER);
    user.removeFromBranch(BranchId.from(BRANCH_ID), LATER);
    user.removeFromBranch(BranchId.from(BRANCH_ID), LATER);

    expect(user.toSnapshot().branchIds).toEqual([]);
  });

  it('owner without branch restrictions can access any branch', () => {
    expect(activeOwner().canAccessBranch(BranchId.from(BRANCH_ID))).toBe(true);
  });

  it('restore recreates user without domain events', () => {
    const restored = User.restore({
      branchIds: [BRANCH_ID],
      createdAt: NOW.iso(),
      email: 'restored@example.com',
      fullName: 'Restored User',
      id: USER_ID,
      passwordHash: 'hash-1',
      phone: '+79990000005',
      role: Role.MANAGER,
      status: UserStatus.PENDING_INVITATION,
      updatedAt: LATER.iso(),
    });

    expect(restored.toSnapshot()).toMatchObject({
      branchIds: [BRANCH_ID],
      email: 'restored@example.com',
      passwordHash: 'hash-1',
      status: UserStatus.PENDING_INVITATION,
      updatedAt: LATER.iso(),
    });
    expect(restored.pullDomainEvents()).toEqual([]);
  });

  it('register rejects invalid phone string', () => {
    expect(() =>
      User.register({
        branchIds: [],
        email: Email.from('owner@example.com'),
        fullName: 'Owner User',
        idGen: idGen(),
        now: NOW,
        passwordHash: PasswordHash.fromHash('hash-1'),
        phone: '79990000001',
        role: Role.OWNER,
      }),
    ).toThrow(InvalidPhoneError);
  });

  it.each(['foo', '@', 'a@b'])('Email rejects invalid value %s', (value) => {
    expect(() => Email.from(value)).toThrow(InvalidEmailError);
  });

  it('Email normalizes value to lowercase', () => {
    expect(Email.from('OWNER@Example.COM').getValue()).toBe('owner@example.com');
  });

  it('Email supports value equality and string conversion', () => {
    const email = Email.from('owner@example.com');

    expect(email.equals(Email.from('OWNER@example.com'))).toBe(true);
    expect(email.toString()).toBe('owner@example.com');
  });

  it('PasswordHash supports value equality', () => {
    expect(PasswordHash.fromHash('hash-1').equals(PasswordHash.fromHash('hash-1'))).toBe(true);
  });
});
