import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver, type EntityManager } from '@mikro-orm/postgresql';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

import {
  Email,
  Invitation,
  InvitationId,
  InvitationToken,
  OtpCodeHash,
  OtpPurpose,
  OtpRequest,
  OtpRequestId,
  PasswordHash,
  RefreshSession,
  Role,
  SessionId,
  User,
  UserId,
} from '@det/backend/iam/domain';
import { DateTime, PhoneNumber } from '@det/backend/shared/ddd';
import type { IIdGenerator } from '@det/backend/shared/ddd';
import { OutboxEventSchema, OutboxService } from '@det/backend/shared/outbox';
import { BranchId } from '@det/shared/types';

import { IamInvitationSchema } from '../../persistence/iam-invitation.schema';
import { IamOtpRequestSchema } from '../../persistence/iam-otp-request.schema';
import { IamRefreshSessionSchema } from '../../persistence/iam-refresh-session.schema';
import { IamUserSchema } from '../../persistence/iam-user.schema';
import { IamInvitationRepository } from '../../repositories/iam-invitation.repository';
import { IamOtpRequestRepository } from '../../repositories/iam-otp-request.repository';
import { IamRefreshSessionRepository } from '../../repositories/iam-refresh-session.repository';
import { IamUserRepository } from '../../repositories/iam-user.repository';

const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const EXPIRES_AT = DateTime.from('2026-01-02T10:00:00.000Z');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const INVITATION_ID = '22222222-2222-4222-8222-222222222222';
const OTP_REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';
const BRANCH_ID = '55555555-5555-4555-8555-555555555555';

class QueueIdGenerator implements IIdGenerator {
  private index = 0;

  constructor(private readonly values: readonly string[]) {}

  generate(): string {
    const value = this.values[this.index];
    this.index += 1;

    if (!value) {
      throw new Error('No queued id value');
    }

    return value;
  }
}

function hash(value: string): string {
  return `sha256:${value}`;
}

function user(): User {
  return User.register({
    branchIds: [BranchId.from(BRANCH_ID)],
    email: Email.from('owner@example.com'),
    fullName: 'Owner User',
    idGen: new QueueIdGenerator([USER_ID]),
    now: NOW,
    passwordHash: PasswordHash.fromHash(hash('password')),
    phone: PhoneNumber.from('+79991234567'),
    role: Role.OWNER,
  });
}

function invitation(): Invitation {
  return Invitation.issue({
    branchIds: [BranchId.from(BRANCH_ID)],
    email: Email.from('manager@example.com'),
    expiresAt: EXPIRES_AT,
    idGen: new QueueIdGenerator([INVITATION_ID]),
    issuerId: UserId.from(USER_ID),
    now: NOW,
    rawToken: 'invite-token',
    role: Role.MANAGER,
    token: InvitationToken.fromRaw('invite-token', hash),
  });
}

function otpRequest(): OtpRequest {
  return OtpRequest.request({
    codeHash: OtpCodeHash.fromHash(
      hash('123456'),
      (rawCode: string, storedHash: string) => hash(rawCode) === storedHash,
    ),
    expiresAt: EXPIRES_AT,
    idGen: new QueueIdGenerator([OTP_REQUEST_ID]),
    now: NOW,
    phone: PhoneNumber.from('+79991234567'),
    purpose: OtpPurpose.LOGIN,
    rawCode: '123456',
  });
}

function refreshSession(): RefreshSession {
  return RefreshSession.issue({
    deviceFingerprint: 'device-1',
    expiresAt: EXPIRES_AT,
    idGen: new QueueIdGenerator([SESSION_ID]),
    now: NOW,
    tokenHash: hash('refresh-token'),
    userId: UserId.from(USER_ID),
  });
}

function userRepo(em: EntityManager): IamUserRepository {
  return new IamUserRepository(em, new OutboxService());
}

function invitationRepo(em: EntityManager): IamInvitationRepository {
  return new IamInvitationRepository(em, new OutboxService(), hash);
}

function otpRepo(em: EntityManager): IamOtpRequestRepository {
  return new IamOtpRequestRepository(em, new OutboxService(), hash);
}

function sessionRepo(em: EntityManager): IamRefreshSessionRepository {
  return new IamRefreshSessionRepository(em, new OutboxService());
}

async function outboxCount(em: EntityManager): Promise<number> {
  return em.count(OutboxEventSchema, {});
}

describe('IAM infrastructure repositories', () => {
  let container: StartedTestContainer;
  let orm: MikroORM<PostgreSqlDriver>;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'iam_infrastructure',
        POSTGRES_PASSWORD: 'iam',
        POSTGRES_USER: 'iam',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    orm = await MikroORM.init<PostgreSqlDriver>({
      clientUrl: `postgres://iam:iam@${container.getHost()}:${String(container.getMappedPort(5432))}/iam_infrastructure`,
      driver: PostgreSqlDriver,
      entities: [
        IamUserSchema,
        IamInvitationSchema,
        IamOtpRequestSchema,
        IamRefreshSessionSchema,
        OutboxEventSchema,
      ],
    });

    await orm.schema.createSchema();
  }, 60_000);

  afterAll(async () => {
    await orm.close(true);
    await container.stop();
  });

  beforeEach(async () => {
    await orm.em.execute(
      'truncate table outbox_events, iam_refresh_session, iam_otp_request, iam_invitation, iam_user',
    );
  });

  it('saves and restores User', async () => {
    const em = orm.em.fork();
    const aggregate = user();

    await userRepo(em).save(aggregate);

    em.clear();
    const found = await userRepo(em).findById(UserId.from(USER_ID));

    expect(found?.toSnapshot()).toEqual(aggregate.toSnapshot());
  });

  it('saves and restores Invitation', async () => {
    const em = orm.em.fork();
    const aggregate = invitation();

    await invitationRepo(em).save(aggregate);

    em.clear();
    const found = await invitationRepo(em).findById(InvitationId.from(INVITATION_ID));

    expect(found?.toSnapshot()).toEqual(aggregate.toSnapshot());
  });

  it('saves and restores OtpRequest', async () => {
    const em = orm.em.fork();
    const aggregate = otpRequest();

    await otpRepo(em).save(aggregate);

    em.clear();
    const found = await otpRepo(em).findById(OtpRequestId.from(OTP_REQUEST_ID));

    expect(found?.toSnapshot()).toEqual(aggregate.toSnapshot());
  });

  it('saves and restores RefreshSession', async () => {
    const em = orm.em.fork();
    const aggregate = refreshSession();

    await sessionRepo(em).save(aggregate);

    em.clear();
    const found = await sessionRepo(em).findById(SessionId.from(SESSION_ID));

    expect(found?.toSnapshot()).toEqual(aggregate.toSnapshot());
  });

  it('appends domain events to outbox when aggregate is saved', async () => {
    const em = orm.em.fork();

    await userRepo(em).save(user());

    expect(await outboxCount(em)).toBe(1);
  });

  it('rolls back outbox events with aggregate transaction', async () => {
    const em = orm.em.fork();

    await expect(
      em.transactional(async (txEm) => {
        await userRepo(txEm).save(user());
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    expect(await outboxCount(em)).toBe(0);
  });
});
