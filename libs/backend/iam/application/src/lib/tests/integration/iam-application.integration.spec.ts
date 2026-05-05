import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { GenericContainer } from 'testcontainers';

import {
  Email,
  type IInvitationRepository,
  type IUserRepository,
  Invitation,
  InvitationId,
  InvitationStatus,
  PasswordHash,
  Role,
  User,
  UserId,
  UserStatus,
} from '@det/backend/iam/domain';
import { CLOCK, DateTime, ID_GENERATOR, PhoneNumber } from '@det/backend/shared/ddd';
import type { DomainEvent, IClock, IIdGenerator } from '@det/backend/shared/ddd';
import { BranchId } from '@det/shared/types';

import { AcceptInvitationCommand } from '../../commands/accept-invitation/accept-invitation.command';
import { BlockUserCommand } from '../../commands/block-user/block-user.command';
import { ChangePasswordCommand } from '../../commands/change-password/change-password.command';
import { IssueInvitationCommand } from '../../commands/issue-invitation/issue-invitation.command';
import { RegisterOwnerCommand } from '../../commands/register-owner/register-owner.command';
import {
  HASH_FN,
  INVITATION_REPOSITORY,
  PASSWORD_HASHER,
  TOKEN_GENERATOR,
  USER_REPOSITORY,
} from '../../di/tokens';
import {
  ForbiddenInvitationIssuerError,
  InvalidPasswordError,
  UserAlreadyExistsError,
} from '../../errors/application.errors';
import { IamApplicationModule } from '../../iam-application.module';
import { GetCurrentUserQuery } from '../../queries/get-current-user/get-current-user.query';

import type { IPasswordHasher } from '../../ports/password-hasher/password-hasher.port';
import type { ITokenGenerator } from '../../ports/token-generator/token-generator.port';
import type { TestingModule } from '@nestjs/testing';
import type { QueryResultRow } from 'pg';
import type { StartedTestContainer } from 'testcontainers';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MANAGER_ID = '22222222-2222-4222-8222-222222222222';
const MASTER_ID = '33333333-3333-4333-8333-333333333333';
const INVITATION_ID = '44444444-4444-4444-8444-444444444444';
const BRANCH_ID = '55555555-5555-4555-8555-555555555555';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');
const OWNER_USER_ID = UserId.from(OWNER_ID);
const MANAGER_USER_ID = UserId.from(MANAGER_ID);
const MASTER_USER_ID = UserId.from(MASTER_ID);
const INVITATION_INVITATION_ID = InvitationId.from(INVITATION_ID);

interface UserRow extends QueryResultRow {
  readonly id: string;
  readonly email: string;
  readonly phone: string;
  readonly password_hash: string | null;
  readonly full_name: string;
  readonly role: Role;
  readonly branch_ids: readonly string[];
  readonly status: UserStatus;
  readonly created_at: Date;
  readonly updated_at: Date | null;
}

interface InvitationRow extends QueryResultRow {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly branch_ids: readonly string[];
  readonly token_hash: string;
  readonly status: InvitationStatus;
  readonly expires_at: Date;
  readonly invited_by: string;
}

interface OutboxRow extends QueryResultRow {
  readonly event_type: string;
  readonly payload: Record<string, unknown>;
}

class FixedClock implements IClock {
  constructor(private readonly current: DateTime) {}

  now(): DateTime {
    return this.current;
  }
}

class QueueIdGenerator implements IIdGenerator {
  private ids: string[] = [];

  reset(ids: readonly string[]): void {
    this.ids = [...ids];
  }

  generate(): string {
    const id = this.ids.shift();

    if (!id) {
      throw new Error('No test id available');
    }

    return id;
  }
}

class FakePasswordHasher implements IPasswordHasher {
  hash(plain: string): Promise<PasswordHash> {
    return Promise.resolve(PasswordHash.fromHash(`hash:${plain}`));
  }

  verify(plain: string, hash: PasswordHash): Promise<boolean> {
    return Promise.resolve(hash.getValue() === `hash:${plain}`);
  }
}

class FakeTokenGenerator implements ITokenGenerator {
  generateInvitationToken(): { raw: string; hash: string } {
    return {
      hash: hashToken('invite-token'),
      raw: 'invite-token',
    };
  }
}

class PostgresUserRepository implements IUserRepository {
  constructor(private readonly client: Client) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.findOne('select * from iam_users where id = $1', [id]);

    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.findOne('select * from iam_users where email = $1', [email.getValue()]);

    return row ? this.toDomain(row) : null;
  }

  async findByPhone(phone: PhoneNumber): Promise<User | null> {
    const row = await this.findOne('select * from iam_users where phone = $1', [phone.toString()]);

    return row ? this.toDomain(row) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const result = await this.client.query<{ readonly exists: boolean }>(
      'select exists(select 1 from iam_users where email = $1) as exists',
      [email.getValue()],
    );
    const row = result.rows[0];

    return row?.exists ?? false;
  }

  async countOwners(): Promise<number> {
    const result = await this.client.query<{ readonly count: string }>(
      'select count(*)::text as count from iam_users where role = $1',
      [Role.OWNER],
    );
    const row = result.rows[0];

    return row ? Number.parseInt(row.count, 10) : 0;
  }

  async save(user: User): Promise<void> {
    const snapshot = user.toSnapshot();
    const events = user.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into iam_users (id, email, phone, password_hash, full_name, role, branch_ids, status, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (id) do update set
           email = excluded.email,
           phone = excluded.phone,
           password_hash = excluded.password_hash,
           full_name = excluded.full_name,
           role = excluded.role,
           branch_ids = excluded.branch_ids,
           status = excluded.status,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at`,
        [
          snapshot.id,
          snapshot.email,
          snapshot.phone,
          snapshot.passwordHash,
          snapshot.fullName,
          snapshot.role,
          snapshot.branchIds,
          snapshot.status,
          snapshot.createdAt,
          snapshot.updatedAt,
        ],
      );
      await insertOutboxEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private async findOne(sql: string, values: readonly string[]): Promise<UserRow | null> {
    const result = await this.client.query<UserRow>(sql, [...values]);

    return result.rows[0] ?? null;
  }

  private toDomain(row: UserRow): User {
    return User.restore({
      branchIds: row.branch_ids,
      createdAt: row.created_at.toISOString(),
      email: row.email,
      fullName: row.full_name,
      id: row.id,
      passwordHash: row.password_hash,
      phone: row.phone,
      role: row.role,
      status: row.status,
      updatedAt: row.updated_at?.toISOString() ?? null,
    });
  }
}

class PostgresInvitationRepository implements IInvitationRepository {
  constructor(
    private readonly client: Client,
    private readonly hashFn: (value: string) => string,
  ) {}

  async findById(id: InvitationId): Promise<Invitation | null> {
    const row = await this.findOne('select * from iam_invitations where id = $1', [id]);

    return row ? this.toDomain(row) : null;
  }

  async findByRawToken(rawToken: string): Promise<Invitation | null> {
    const row = await this.findOne('select * from iam_invitations where token_hash = $1', [
      this.hashFn(rawToken),
    ]);

    return row ? this.toDomain(row) : null;
  }

  async findByEmailAndStatus(email: Email, status: InvitationStatus): Promise<Invitation | null> {
    const row = await this.findOne(
      'select * from iam_invitations where email = $1 and status = $2',
      [email.getValue(), status],
    );

    return row ? this.toDomain(row) : null;
  }

  async save(invitation: Invitation): Promise<void> {
    const snapshot = invitation.toSnapshot();
    const events = invitation.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into iam_invitations (id, email, role, branch_ids, token_hash, status, expires_at, invited_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (id) do update set
           email = excluded.email,
           role = excluded.role,
           branch_ids = excluded.branch_ids,
           token_hash = excluded.token_hash,
           status = excluded.status,
           expires_at = excluded.expires_at,
           invited_by = excluded.invited_by`,
        [
          snapshot.id,
          snapshot.email,
          snapshot.role,
          snapshot.branchIds,
          snapshot.tokenHash,
          snapshot.status,
          snapshot.expiresAt,
          snapshot.invitedBy,
        ],
      );
      await insertOutboxEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private async findOne(sql: string, values: readonly string[]): Promise<InvitationRow | null> {
    const result = await this.client.query<InvitationRow>(sql, [...values]);

    return result.rows[0] ?? null;
  }

  private toDomain(row: InvitationRow): Invitation {
    return Invitation.restore(
      {
        branchIds: row.branch_ids,
        email: row.email,
        expiresAt: row.expires_at.toISOString(),
        id: row.id,
        invitedBy: row.invited_by,
        role: row.role,
        status: row.status,
        tokenHash: row.token_hash,
      },
      this.hashFn,
    );
  }
}

function hashToken(value: string): string {
  return `sha256:${value}`;
}

async function insertOutboxEvents(client: Client, events: readonly DomainEvent[]): Promise<void> {
  for (const event of events) {
    await client.query(
      `insert into outbox_events (id, aggregate_id, aggregate_type, event_type, payload, occurred_at)
       values ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        event.eventId,
        event.aggregateId,
        event.aggregateType,
        event.eventType,
        JSON.stringify(event),
        event.occurredAt,
      ],
    );
  }
}

async function createSchema(client: Client): Promise<void> {
  await client.query(`
    create table if not exists iam_users (
      id uuid primary key,
      email text not null unique,
      phone text not null,
      password_hash text,
      full_name text not null,
      role text not null,
      branch_ids text[] not null,
      status text not null,
      created_at timestamptz not null,
      updated_at timestamptz
    );

    create table if not exists iam_invitations (
      id uuid primary key,
      email text not null,
      role text not null,
      branch_ids text[] not null,
      token_hash text not null unique,
      status text not null,
      expires_at timestamptz not null,
      invited_by uuid not null
    );

    create table if not exists outbox_events (
      id text primary key,
      aggregate_id text not null,
      aggregate_type text not null,
      event_type text not null,
      payload jsonb not null,
      occurred_at timestamptz not null
    );
  `);
}

async function truncateSchema(client: Client): Promise<void> {
  await client.query('truncate table outbox_events, iam_invitations, iam_users');
}

async function outboxEvents(client: Client): Promise<readonly OutboxRow[]> {
  const result = await client.query<OutboxRow>(
    'select event_type, payload from outbox_events order by occurred_at, id',
  );

  return result.rows;
}

describe('IamApplicationModule integration', () => {
  let container: StartedTestContainer;
  let client: Client;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let moduleRef: TestingModule;
  let userRepo: PostgresUserRepository;
  let invitationRepo: PostgresInvitationRepository;
  let idGen: QueueIdGenerator;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'iam_application',
        POSTGRES_PASSWORD: 'iam',
        POSTGRES_USER: 'iam',
      })
      .withExposedPorts(5432)
      .start();

    client = new Client({
      database: 'iam_application',
      host: container.getHost(),
      password: 'iam',
      port: container.getMappedPort(5432),
      user: 'iam',
    });
    await client.connect();
    await createSchema(client);
  }, 60_000);

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  beforeEach(async () => {
    await truncateSchema(client);

    idGen = new QueueIdGenerator();
    userRepo = new PostgresUserRepository(client);
    invitationRepo = new PostgresInvitationRepository(client, hashToken);

    moduleRef = await Test.createTestingModule({
      imports: [
        IamApplicationModule.register([
          { provide: USER_REPOSITORY, useValue: userRepo },
          { provide: INVITATION_REPOSITORY, useValue: invitationRepo },
          { provide: PASSWORD_HASHER, useClass: FakePasswordHasher },
          { provide: TOKEN_GENERATOR, useClass: FakeTokenGenerator },
          { provide: CLOCK, useValue: new FixedClock(NOW) },
          { provide: ID_GENERATOR, useValue: idGen },
          { provide: HASH_FN, useValue: hashToken },
        ]),
      ],
    }).compile();
    await moduleRef.init();

    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('registers owner and returns current user dto', async () => {
    idGen.reset([OWNER_ID]);

    const result = await commandBus.execute<RegisterOwnerCommand, { readonly id: UserId }>(
      new RegisterOwnerCommand('OWNER@EXAMPLE.COM', '+79991234567', 'secret', 'Owner User'),
    );

    expect(result.id).toBe(OWNER_ID);

    const user = await userRepo.findById(result.id);
    expect(user?.toSnapshot()).toMatchObject({
      email: 'owner@example.com',
      passwordHash: 'hash:secret',
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
    });

    const currentUser = await queryBus.execute(new GetCurrentUserQuery(result.id));
    expect(currentUser).toMatchObject({
      email: 'owner@example.com',
      fullName: 'Owner User',
      id: OWNER_ID,
      role: Role.OWNER,
    });
    await expect(outboxEvents(client)).resolves.toMatchObject([{ event_type: 'UserRegistered' }]);
  });

  it('rejects duplicate owner email', async () => {
    idGen.reset([OWNER_ID, MANAGER_ID]);

    await commandBus.execute(
      new RegisterOwnerCommand('owner@example.com', '+79991234567', 'secret', 'Owner User'),
    );

    await expect(
      commandBus.execute(
        new RegisterOwnerCommand('OWNER@example.com', '+79997654321', 'secret', 'Other Owner'),
      ),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it('issues invitation by owner and writes outbox event with raw token', async () => {
    idGen.reset([OWNER_ID, INVITATION_ID]);
    const owner = User.register({
      branchIds: [],
      email: Email.from('owner@example.com'),
      fullName: 'Owner User',
      idGen,
      now: NOW,
      passwordHash: PasswordHash.fromHash('hash:secret'),
      phone: PhoneNumber.from('+79991234567'),
      role: Role.OWNER,
    });
    owner.pullDomainEvents();
    await userRepo.save(owner);

    const result = await commandBus.execute<IssueInvitationCommand, { readonly id: InvitationId }>(
      new IssueInvitationCommand(OWNER_USER_ID, 'master@example.com', Role.MASTER, [
        BranchId.from(BRANCH_ID),
      ]),
    );

    expect(result.id).toBe(INVITATION_ID);

    const invitation = await invitationRepo.findById(result.id);
    expect(invitation?.toSnapshot()).toMatchObject({
      email: 'master@example.com',
      role: Role.MASTER,
      status: InvitationStatus.PENDING,
    });

    const events = await outboxEvents(client);
    expect(events).toMatchObject([{ event_type: 'InvitationIssued' }]);
    expect(events[0]?.payload).toMatchObject({ rawToken: 'invite-token' });
  });

  it('rejects invitation issued by master', async () => {
    idGen.reset([MASTER_ID]);
    const master = User.register({
      branchIds: [BranchId.from(BRANCH_ID)],
      email: Email.from('master@example.com'),
      fullName: 'Master User',
      idGen,
      now: NOW,
      passwordHash: PasswordHash.fromHash('hash:secret'),
      phone: PhoneNumber.from('+79991234567'),
      role: Role.MASTER,
    });
    await userRepo.save(master);

    await expect(
      commandBus.execute(
        new IssueInvitationCommand(MASTER_USER_ID, 'other@example.com', Role.MASTER, [
          BranchId.from(BRANCH_ID),
        ]),
      ),
    ).rejects.toBeInstanceOf(ForbiddenInvitationIssuerError);
  });

  it('accepts invitation and stores only invitation aggregate changes', async () => {
    idGen.reset([OWNER_ID, INVITATION_ID]);
    const owner = User.register({
      branchIds: [],
      email: Email.from('owner@example.com'),
      fullName: 'Owner User',
      idGen,
      now: NOW,
      passwordHash: PasswordHash.fromHash('hash:secret'),
      phone: PhoneNumber.from('+79991234567'),
      role: Role.OWNER,
    });
    owner.pullDomainEvents();
    await userRepo.save(owner);
    await commandBus.execute(
      new IssueInvitationCommand(OWNER_USER_ID, 'master@example.com', Role.MASTER, [
        BranchId.from(BRANCH_ID),
      ]),
    );
    await client.query('truncate table outbox_events');

    await commandBus.execute(
      new AcceptInvitationCommand('invite-token', 'new-secret', 'Master User', '+79997654321'),
    );

    const invitation = await invitationRepo.findById(INVITATION_INVITATION_ID);
    expect(invitation?.toSnapshot().status).toBe(InvitationStatus.ACCEPTED);
    await expect(userRepo.findByEmail(Email.from('master@example.com'))).resolves.toBeNull();

    const events = await outboxEvents(client);
    expect(events).toMatchObject([{ event_type: 'InvitationAccepted' }]);
    expect(events[0]?.payload).toMatchObject({ fullName: 'Master User' });
  });

  it('changes password after verifying old password', async () => {
    idGen.reset([OWNER_ID]);
    await commandBus.execute(
      new RegisterOwnerCommand('owner@example.com', '+79991234567', 'secret', 'Owner User'),
    );

    await commandBus.execute(new ChangePasswordCommand(OWNER_USER_ID, 'secret', 'new-secret'));

    const user = await userRepo.findById(OWNER_USER_ID);
    expect(user?.toSnapshot().passwordHash).toBe('hash:new-secret');
  });

  it('rejects wrong old password', async () => {
    idGen.reset([OWNER_ID]);
    await commandBus.execute(
      new RegisterOwnerCommand('owner@example.com', '+79991234567', 'secret', 'Owner User'),
    );

    await expect(
      commandBus.execute(new ChangePasswordCommand(OWNER_USER_ID, 'wrong', 'new-secret')),
    ).rejects.toBeInstanceOf(InvalidPasswordError);
  });

  it('blocks non-last owner but rejects last owner block', async () => {
    idGen.reset([OWNER_ID, MANAGER_ID]);
    await commandBus.execute(
      new RegisterOwnerCommand('owner@example.com', '+79991234567', 'secret', 'Owner User'),
    );

    await expect(
      commandBus.execute(new BlockUserCommand(OWNER_USER_ID, OWNER_USER_ID, 'policy')),
    ).rejects.toThrow('Cannot block last owner');

    const manager = User.activateFromInvitation({
      branchIds: [BranchId.from(BRANCH_ID)],
      email: Email.from('manager@example.com'),
      fullName: 'Manager User',
      idGen,
      now: NOW,
      passwordHash: PasswordHash.fromHash('hash:secret'),
      phone: PhoneNumber.from('+79997654321'),
      role: Role.MANAGER,
    });
    manager.pullDomainEvents();
    await userRepo.save(manager);

    await commandBus.execute(new BlockUserCommand(MANAGER_USER_ID, OWNER_USER_ID, 'policy'));

    const blocked = await userRepo.findById(MANAGER_USER_ID);
    expect(blocked?.toSnapshot().status).toBe(UserStatus.BLOCKED);
  });
});
