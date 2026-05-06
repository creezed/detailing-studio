import { AggregateRoot, DateTime, PhoneNumber } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';
import { BranchId } from '@det/shared/types';

import { UserId } from './user-id';
import { UserStatus } from './user-status';
import {
  CannotArchiveLastOwnerError,
  CannotBlockLastOwnerError,
  InvalidPhoneError,
  UserAlreadyBlockedError,
  UserNotActiveError,
} from './user.errors';
import {
  UserActivated,
  UserArchived,
  UserBlocked,
  UserPasswordChanged,
  UserRegistered,
  UserUnblocked,
} from './user.events';
import { Email } from '../shared/email.value-object';
import { PasswordHash } from '../shared/password-hash.value-object';
import { Role } from '../shared/role';

export interface RegisterUserProps {
  readonly email: Email | string;
  readonly phone: PhoneNumber | string;
  readonly passwordHash: PasswordHash | null;
  readonly fullName: string;
  readonly role: Role;
  readonly branchIds: readonly BranchId[];
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface ActivateUserFromInvitationProps {
  readonly email: Email | string;
  readonly phone: PhoneNumber | string;
  readonly passwordHash: PasswordHash | null;
  readonly fullName: string;
  readonly role: Role;
  readonly branchIds: readonly BranchId[];
  readonly idGen: IIdGenerator;
  readonly now: DateTime;
}

export interface UserSnapshot {
  readonly id: string;
  readonly email: string;
  readonly phone: string;
  readonly passwordHash: string | null;
  readonly fullName: string;
  readonly role: Role;
  readonly branchIds: readonly string[];
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly updatedAt: string | null;
}

export class User extends AggregateRoot<UserId> {
  private constructor(
    private readonly _id: UserId,
    private readonly _email: Email,
    private readonly _phone: PhoneNumber,
    private _passwordHash: PasswordHash | null,
    private readonly _fullName: string,
    private readonly _role: Role,
    private readonly _branchIds: Set<BranchId>,
    private _status: UserStatus,
    private readonly _createdAt: DateTime,
    private _updatedAt: DateTime | null,
  ) {
    super();
  }

  override get id(): UserId {
    return this._id;
  }

  static register(props: RegisterUserProps): User {
    const user = new User(
      UserId.generate(props.idGen),
      User.toEmail(props.email),
      User.toPhoneNumber(props.phone),
      props.passwordHash,
      props.fullName,
      props.role,
      new Set(props.branchIds),
      User.getInitialStatus(props.role),
      props.now,
      null,
    );

    user.addEvent(new UserRegistered(user.id, user._email, user._role, user._status, props.now));

    return user;
  }

  static activateFromInvitation(props: ActivateUserFromInvitationProps): User {
    const user = new User(
      UserId.generate(props.idGen),
      User.toEmail(props.email),
      User.toPhoneNumber(props.phone),
      props.passwordHash,
      props.fullName,
      props.role,
      new Set(props.branchIds),
      UserStatus.ACTIVE,
      props.now,
      props.now,
    );

    user.addEvent(new UserRegistered(user.id, user._email, user._role, user._status, props.now));
    user.addEvent(new UserActivated(user.id, props.now));

    return user;
  }

  static restore(snapshot: UserSnapshot): User {
    return new User(
      UserId.from(snapshot.id),
      Email.from(snapshot.email),
      User.toPhoneNumber(snapshot.phone),
      snapshot.passwordHash === null ? null : PasswordHash.fromHash(snapshot.passwordHash),
      snapshot.fullName,
      snapshot.role,
      new Set(snapshot.branchIds.map((branchId) => BranchId.from(branchId))),
      snapshot.status,
      DateTime.from(snapshot.createdAt),
      snapshot.updatedAt === null ? null : DateTime.from(snapshot.updatedAt),
    );
  }

  changePassword(newHash: PasswordHash, now: DateTime): void {
    this.ensureActive();

    this._passwordHash = newHash;
    this.touch(now);
    this.addEvent(new UserPasswordChanged(this.id, now));
  }

  block(by: UserId, reason: string, now: DateTime): void {
    this.blockWithOwnerGuard(by, reason, now, false);
  }

  blockWithOwnerGuard(by: UserId, reason: string, now: DateTime, isLastOwner: boolean): void {
    if (this._role === Role.OWNER && isLastOwner) {
      throw new CannotBlockLastOwnerError(this.id);
    }

    if (this._status === UserStatus.BLOCKED) {
      throw new UserAlreadyBlockedError(this.id);
    }

    this.ensureActive();

    this._status = UserStatus.BLOCKED;
    this.touch(now);
    this.addEvent(new UserBlocked(this.id, by, reason, now));
  }

  unblock(by: UserId, now: DateTime): void {
    if (this._status !== UserStatus.BLOCKED) {
      throw new UserNotActiveError(this.id);
    }

    this._status = UserStatus.ACTIVE;
    this.touch(now);
    this.addEvent(new UserUnblocked(this.id, by, now));
  }

  archive(by: UserId, now: DateTime, isLastOwner: boolean): void {
    if (this._role === Role.OWNER && isLastOwner) {
      throw new CannotArchiveLastOwnerError(this.id);
    }

    this._status = UserStatus.ARCHIVED;
    this.touch(now);
    this.addEvent(new UserArchived(this.id, by, now));
  }

  assignToBranch(branchId: BranchId, now: DateTime): void {
    if (this._branchIds.has(branchId)) {
      return;
    }

    this._branchIds.add(branchId);
    this.touch(now);
  }

  removeFromBranch(branchId: BranchId, now: DateTime): void {
    if (this._branchIds.delete(branchId)) {
      this.touch(now);
    }
  }

  hasRole(role: Role): boolean {
    return this._role === role;
  }

  canAccessBranch(branchId: BranchId): boolean {
    if (this._role === Role.OWNER && this._branchIds.size === 0) {
      return true;
    }

    return this._branchIds.has(branchId);
  }

  toSnapshot(): UserSnapshot {
    return {
      branchIds: [...this._branchIds],
      createdAt: this._createdAt.iso(),
      email: this._email.getValue(),
      fullName: this._fullName,
      id: this.id,
      passwordHash: this._passwordHash?.getValue() ?? null,
      phone: this._phone.toString(),
      role: this._role,
      status: this._status,
      updatedAt: this._updatedAt?.iso() ?? null,
    };
  }

  private static getInitialStatus(role: Role): UserStatus {
    if (role === Role.OWNER || role === Role.CLIENT) {
      return UserStatus.ACTIVE;
    }

    return UserStatus.PENDING_INVITATION;
  }

  private static toEmail(value: Email | string): Email {
    if (value instanceof Email) {
      return value;
    }

    return Email.from(value);
  }

  private static toPhoneNumber(value: PhoneNumber | string): PhoneNumber {
    if (value instanceof PhoneNumber) {
      return value;
    }

    try {
      return PhoneNumber.from(value);
    } catch {
      throw new InvalidPhoneError(value);
    }
  }

  private ensureActive(): void {
    if (this._status !== UserStatus.ACTIVE) {
      throw new UserNotActiveError(this.id);
    }
  }

  private touch(now: DateTime): void {
    this._updatedAt = now;
  }
}
