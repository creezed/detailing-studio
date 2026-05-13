import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';

import { Client } from 'pg';
import request from 'supertest';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

import type { AddressInfo } from 'node:net';
import type { QueryResultRow } from 'pg';

const JWT_SECRET =
  'test-secret-key-that-is-long-enough-for-hs512-algorithm-at-least-64-bytes-long!!';
const TEST_TIMEOUT = 60_000;
const WORKSPACE_ROOT = resolve(__dirname, '../../../../..');
const API_ENTRYPOINT = join(WORKSPACE_ROOT, 'dist/apps/backend/api/main.js');
const BRANCH_ID = '55555555-5555-4555-8555-555555555555';
const supertest = request;

interface LoginResponseUser {
  readonly id: string;
  readonly fullName: string;
  readonly role: string;
}

interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly user: LoginResponseUser;
}

interface CurrentUserResponse {
  readonly id: string;
  readonly email: string;
  readonly phone: string;
  readonly fullName: string;
  readonly role: string;
  readonly status: string;
}

interface OutboxRow extends QueryResultRow {
  readonly event_type: string;
  readonly payload: unknown;
}

interface SessionStatusRow extends QueryResultRow {
  readonly status: string;
}

interface ApiErrorResponse {
  readonly error: string;
  readonly statusCode: number;
  readonly message: string;
}

class ApiProcess {
  private childProcess: ChildProcessWithoutNullStreams | null = null;
  private exitDescription: string | null = null;
  private readonly logLines: string[] = [];
  private logBuffer = '';

  constructor(
    private readonly port: number,
    private readonly databaseUrl: string,
    private readonly redisHost: string = '127.0.0.1',
    private readonly redisPort: number = 6379,
  ) {}

  get baseUrl(): string {
    return `http://127.0.0.1:${String(this.port)}`;
  }

  get logs(): readonly string[] {
    return this.logLines;
  }

  async start(): Promise<void> {
    const started = this.waitForStartup();

    this.childProcess = spawn(process.execPath, [API_ENTRYPOINT], {
      cwd: WORKSPACE_ROOT,
      env: {
        API_PORT: String(this.port),
        CORS_ORIGINS: 'http://localhost:4200',
        DATABASE_URL: this.databaseUrl,
        JWT_ACCESS_TTL: '15m',
        JWT_SECRET,
        NODE_ENV: 'test',
        THROTTLE_LIMIT: '10000',
        NOTIFICATIONS_TRANSPORT: 'fake',
        REDIS_HOST: this.redisHost,
        REDIS_PORT: String(this.redisPort),
        SMS_RU_API_KEY: '',
        SMTP_FROM: 'test@studio.test',
        SMTP_HOST: '127.0.0.1',
        SMTP_PASS: 'test',
        SMTP_PORT: '1025',
        SMTP_USER: 'test',
        UNSUBSCRIBE_SECRET: 'e2e-unsubscribe-secret',
        VAPID_PRIVATE_KEY: '4GWhz4f95DVay2njySkvFgnejHkFiPFiSDk3CGmbcMs',
        VAPID_PUBLIC_KEY:
          'BIGEpyJUYnVyA0HmYtgv4qaPihXzI3nEMCsLgpczz10tycprwztP6X2-3KImCrgT20bJBun7Trrr2dDBOrzPQlg',
        VAPID_SUBJECT: 'mailto:test@studio.test',
      },
      stdio: 'pipe',
    });

    this.childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      this.exitDescription = `code=${String(code)} signal=${String(signal)}`;
    });
    this.childProcess.stdout.on('data', (chunk: Buffer) => {
      this.appendLogChunk(chunk);
    });
    this.childProcess.stderr.on('data', (chunk: Buffer) => {
      this.appendLogChunk(chunk);
    });

    await started;
    await supertest(this.baseUrl).get('/api/health').expect(200);
    this.ensureRunning();
  }

  ensureRunning(): void {
    if (this.exitDescription === null) {
      return;
    }

    throw new Error(`API process stopped (${this.exitDescription}). Logs:\n${this.logsText()}`);
  }

  async stop(): Promise<void> {
    const runningProcess = this.childProcess;

    if (!runningProcess || runningProcess.exitCode !== null) {
      return;
    }

    const exited = waitForProcessExit(runningProcess, 5_000);
    runningProcess.kill('SIGTERM');

    try {
      await exited;
    } catch {
      runningProcess.kill('SIGKILL');
      await waitForProcessExit(runningProcess, 5_000);
    }
  }

  private waitForStartup(): Promise<void> {
    return new Promise((resolveReady, rejectReady) => {
      const timeout = setTimeout(() => {
        rejectReady(new Error(`API did not start. Logs:\n${this.logsText()}`));
      }, TEST_TIMEOUT);
      const cleanup = (): void => {
        clearTimeout(timeout);
        this.childProcess?.off('exit', onExit);
        this.childProcess?.stdout.off('data', onOutput);
        this.childProcess?.stderr.off('data', onOutput);
      };
      const onOutput = (): void => {
        if (this.logLines.some((line) => line.includes('Nest application successfully started'))) {
          cleanup();
          resolveReady();
        }
      };
      const onExit = (code: number | null): void => {
        cleanup();
        rejectReady(new Error(`API exited before startup with code ${String(code)}`));
      };
      const attach = (): void => {
        if (!this.childProcess) {
          rejectReady(new Error('API process was not spawned'));
          return;
        }

        this.childProcess.stdout.on('data', onOutput);
        this.childProcess.stderr.on('data', onOutput);
        this.childProcess.on('exit', onExit);
      };

      queueMicrotask(attach);
    });
  }

  private appendLogChunk(chunk: Buffer): void {
    this.logBuffer += chunk.toString('utf8');
    const lines = this.logBuffer.split('\n');
    const lastLine = lines.pop();
    this.logBuffer = lastLine ?? '';

    for (const line of lines) {
      if (line.length > 0) {
        this.logLines.push(line);
      }
    }
  }

  private logsText(): string {
    const trailingLine = this.logBuffer.length > 0 ? [this.logBuffer] : [];

    return [...this.logLines, ...trailingLine].join('\n');
  }
}

describe('Backend API IAM auth e2e', () => {
  let pgContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let client: Client;
  let api: ApiProcess;

  beforeAll(async () => {
    const [pg, redis] = await Promise.all([
      new GenericContainer('postgres:16-alpine')
        .withEnvironment({
          POSTGRES_DB: 'backend_api_e2e',
          POSTGRES_PASSWORD: 'e2e',
          POSTGRES_USER: 'e2e',
        })
        .withExposedPorts(5432)
        .withWaitStrategy(Wait.forLogMessage('ready to accept connections', 2))
        .start(),
      new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withWaitStrategy(Wait.forLogMessage('Ready to accept connections', 1))
        .start(),
    ]);

    pgContainer = pg;
    redisContainer = redis;

    const databaseUrl = `postgres://e2e:e2e@${pg.getHost()}:${String(
      pg.getMappedPort(5432),
    )}/backend_api_e2e`;

    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await runMigrations(client);

    api = new ApiProcess(
      await getFreePort(),
      databaseUrl,
      redis.getHost(),
      redis.getMappedPort(6379),
    );
    await api.start();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await api.stop();
    await client.end();
    await Promise.all([pgContainer.stop(), redisContainer.stop()]);
  });

  afterEach(async () => {
    await resetDatabase(client);
  });

  beforeEach(() => {
    api.ensureRunning();
  });

  it('owner self-signup returns tokens and /users/me works', async () => {
    const registerResponse = await registerOwner('owner-self-signup@studio.test', '+79990000001');
    const registerBody = loginResponseFrom(registerResponse.body);

    expect(registerBody.accessToken.length).toBeGreaterThan(0);
    expect(registerBody.refreshToken.length).toBeGreaterThan(0);
    expect(registerBody.user.role).toBe('OWNER');

    const meResponse = await supertest(api.baseUrl)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200);
    const meBody = currentUserResponseFrom(meResponse.body);

    expect(meBody.email).toBe('owner-self-signup@studio.test');
    expect(meBody.role).toBe('OWNER');
    expect(meBody.status).toBe('ACTIVE');
  });

  it('owner invites manager who accepts, logs in and reads /users/me as MANAGER', async () => {
    const owner = loginResponseFrom(
      (await registerOwner('owner-invites-manager@studio.test', '+79990000002')).body,
    );

    await supertest(api.baseUrl)
      .post('/api/users/invitations')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        branchIds: [BRANCH_ID],
        email: 'manager-accepted@studio.test',
        role: 'MANAGER',
      })
      .expect(201);

    const invitationIssued = await findOutboxEvent(client, 'InvitationIssued');
    const rawToken = stringProperty(recordFrom(invitationIssued.payload), 'rawToken');

    await supertest(api.baseUrl)
      .post(`/api/users/invitations/${rawToken}/accept`)
      .send({
        fullName: 'Manager Accepted',
        password: 'Str0ngP@ss',
        phone: '+79990000003',
      })
      .expect(204);

    const invitationAccepted = await findOutboxEvent(client, 'InvitationAccepted');
    expect(stringProperty(recordFrom(invitationAccepted.payload), 'fullName')).toBe(
      'Manager Accepted',
    );

    const managerLogin = loginResponseFrom(
      (
        await supertest(api.baseUrl)
          .post('/api/auth/login')
          .send({
            email: 'manager-accepted@studio.test',
            password: 'Str0ngP@ss',
          })
          .expect(200)
      ).body,
    );

    expect(managerLogin.user.role).toBe('MANAGER');

    const meBody = currentUserResponseFrom(
      (
        await supertest(api.baseUrl)
          .get('/api/users/me')
          .set('Authorization', `Bearer ${managerLogin.accessToken}`)
          .expect(200)
      ).body,
    );

    expect(meBody.email).toBe('manager-accepted@studio.test');
    expect(meBody.role).toBe('MANAGER');
  });

  it('logs in by phone OTP using dev log code', async () => {
    await registerOwner('owner-otp@studio.test', '+79990000004');

    await supertest(api.baseUrl)
      .post('/api/auth/otp/request')
      .send({ phone: '+79990000004' })
      .expect(204);

    const code = findOtpCodeInLogs(api.logs, '+79990000004');

    expect(code).toMatch(/^\d{6}$/);

    const verifyBody = loginResponseFrom(
      (
        await supertest(api.baseUrl)
          .post('/api/auth/otp/verify')
          .send({
            code,
            phone: '+79990000004',
          })
          .expect(200)
      ).body,
    );

    expect(verifyBody.accessToken.length).toBeGreaterThan(0);
    expect(verifyBody.refreshToken.length).toBeGreaterThan(0);
    expect(verifyBody.user.role).toBe('OWNER');
  });

  it('detects refresh-token reuse and compromises all user sessions', async () => {
    const owner = loginResponseFrom(
      (await registerOwner('owner-refresh@studio.test', '+79990000005')).body,
    );
    const secondSession = loginResponseFrom(
      (
        await supertest(api.baseUrl)
          .post('/api/auth/login')
          .send({
            email: 'owner-refresh@studio.test',
            password: 'Str0ngP@ss',
          })
          .expect(200)
      ).body,
    );

    expect(secondSession.refreshToken).not.toBe(owner.refreshToken);

    await supertest(api.baseUrl)
      .post('/api/auth/refresh')
      .send({ refreshToken: owner.refreshToken })
      .expect(200);

    const reuseResponse = await supertest(api.baseUrl)
      .post('/api/auth/refresh')
      .send({ refreshToken: owner.refreshToken })
      .expect(401);
    const reuseBody = apiErrorResponseFrom(reuseResponse.body);

    expect(reuseBody.error).toBe('REFRESH_TOKEN_REUSE');
    await expectSessionStatuses(owner.user.id, ['COMPROMISED', 'COMPROMISED']);
  });

  it('blocked user cannot login', async () => {
    const owner = loginResponseFrom(
      (await registerOwner('blocked-owner@studio.test', '+79990000006')).body,
    );
    await client.query(`update iam_user set status = 'BLOCKED' where id = $1`, [owner.user.id]);

    await supertest(api.baseUrl)
      .post('/api/auth/login')
      .send({
        email: 'blocked-owner@studio.test',
        password: 'Str0ngP@ss',
      })
      .expect(401);
  });

  function registerOwner(email: string, phone: string): Promise<request.Response> {
    return supertest(api.baseUrl)
      .post('/api/auth/register-owner')
      .send({
        email,
        fullName: 'Owner User',
        password: 'Str0ngP@ss',
        phone,
      })
      .expect(201);
  }

  async function expectSessionStatuses(
    userId: string,
    expectedStatuses: readonly string[],
  ): Promise<void> {
    const result = await client.query<SessionStatusRow>(
      `select status from iam_refresh_session where user_id = $1 order by issued_at asc`,
      [userId],
    );

    expect(result.rows.map((row) => row.status)).toEqual(expectedStatuses);
  }
});

async function runMigrations(client: Client): Promise<void> {
  await client.query(`
    create table if not exists "outbox_events" (
      "id" uuid not null,
      "aggregate_type" text not null,
      "aggregate_id" uuid not null,
      "event_type" text not null,
      "payload" jsonb not null,
      "occurred_at" timestamptz not null,
      "published_at" timestamptz null,
      "retry_count" int not null default 0,
      "retry_after_at" timestamptz null,
      "failed_at" timestamptz null,
      "last_error" text null,
      constraint "outbox_events_pkey" primary key ("id")
    );
    create index if not exists "idx_outbox_unpublished" on "outbox_events" ("occurred_at") where "published_at" is null;

    create table if not exists "iam_user" (
      "id" uuid not null,
      "email" text null,
      "phone" text null,
      "password_hash" text null,
      "full_name" text not null,
      "status" text not null,
      "role_set" jsonb not null,
      "branch_ids" jsonb not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      "version" int not null default 1,
      constraint "iam_user_pkey" primary key ("id")
    );
    create unique index if not exists "iam_user_email_unique" on "iam_user" ("email") where "email" is not null;
    create unique index if not exists "iam_user_phone_unique" on "iam_user" ("phone") where "phone" is not null;
    create index if not exists "idx_iam_user_status" on "iam_user" ("status");

    create table if not exists "iam_invitation" (
      "id" uuid not null,
      "email" text not null,
      "role" text not null,
      "branch_ids" jsonb not null,
      "token_hash" text not null,
      "status" text not null,
      "issued_at" timestamptz not null,
      "expires_at" timestamptz not null,
      "accepted_at" timestamptz null,
      "revoked_at" timestamptz null,
      "invited_by" uuid not null,
      constraint "iam_invitation_pkey" primary key ("id")
    );
    create unique index if not exists "iam_invitation_token_hash_unique" on "iam_invitation" ("token_hash");
    create index if not exists "idx_iam_invitation_email_status" on "iam_invitation" ("email", "status");

    create table if not exists "iam_otp_request" (
      "id" uuid not null,
      "phone" text not null,
      "purpose" text not null,
      "code_hash" text not null,
      "attempts_left" int not null,
      "status" text not null,
      "expires_at" timestamptz not null,
      "created_at" timestamptz not null,
      "verified_at" timestamptz null,
      constraint "iam_otp_request_pkey" primary key ("id")
    );
    create index if not exists "idx_iam_otp_request_phone_purpose_status" on "iam_otp_request" ("phone", "purpose", "status");

    create table if not exists "iam_refresh_session" (
      "id" uuid not null,
      "user_id" uuid not null,
      "token_hash" text not null,
      "rotated_token_hashes" jsonb not null default '[]'::jsonb,
      "rotation_counter" int not null default 0,
      "status" text not null,
      "issued_at" timestamptz not null,
      "expires_at" timestamptz not null,
      "last_rotated_at" timestamptz null,
      "revoked_at" timestamptz null,
      "revoked_by" uuid null,
      "compromised_at" timestamptz null,
      "parent_session_id" uuid null,
      constraint "iam_refresh_session_pkey" primary key ("id")
    );
    create index if not exists "idx_iam_refresh_session_user_status" on "iam_refresh_session" ("user_id", "status");
    create index if not exists "idx_iam_refresh_session_token_hash" on "iam_refresh_session" ("token_hash");
    create index if not exists "idx_iam_refresh_session_rotated_hashes" on "iam_refresh_session" using gin ("rotated_token_hashes");

    CREATE TABLE IF NOT EXISTS ntf_notification_template (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body_by_channel JSONB NOT NULL DEFAULT '{}',
      default_channels JSONB NOT NULL DEFAULT '[]',
      is_critical BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ntf_notification (
      id UUID PRIMARY KEY,
      recipient_kind TEXT NOT NULL,
      recipient_user_id UUID,
      recipient_phone TEXT,
      recipient_email TEXT,
      recipient_chat_id TEXT,
      template_code TEXT NOT NULL,
      channel TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'PENDING',
      attempts JSONB NOT NULL DEFAULT '[]',
      scheduled_for TIMESTAMPTZ,
      dedup_scope_key TEXT,
      dedup_template_code TEXT,
      dedup_window_ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS ntf_user_notification_preferences (
      user_id UUID PRIMARY KEY,
      channels_by_template JSONB NOT NULL DEFAULT '{}',
      quiet_hours JSONB,
      unsubscribed_channels JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ntf_push_subscription (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expired_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS ntf_notification_dedup_key (
      scope_key TEXT PRIMARY KEY,
      template_code TEXT NOT NULL,
      last_issued_at TIMESTAMPTZ NOT NULL,
      window_ends_at TIMESTAMPTZ NOT NULL
    );
  `);
}

async function resetDatabase(client: Client): Promise<void> {
  await client.query(
    `truncate table "iam_refresh_session", "iam_otp_request", "iam_invitation", "iam_user", "outbox_events"`,
  );
}

async function findOutboxEvent(client: Client, eventType: string): Promise<OutboxRow> {
  const result = await client.query<OutboxRow>(
    `select event_type, payload from outbox_events where event_type = $1 order by occurred_at desc limit 1`,
    [eventType],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Outbox event ${eventType} was not found`);
  }

  return row;
}

function loginResponseFrom(value: unknown): LoginResponse {
  if (!isLoginResponse(value)) {
    throw new Error(`Expected login response, got ${JSON.stringify(value)}`);
  }

  return value;
}

function currentUserResponseFrom(value: unknown): CurrentUserResponse {
  if (!isCurrentUserResponse(value)) {
    throw new Error(`Expected current user response, got ${JSON.stringify(value)}`);
  }

  return value;
}

function apiErrorResponseFrom(value: unknown): ApiErrorResponse {
  if (!isApiErrorResponse(value)) {
    throw new Error(`Expected API error response, got ${JSON.stringify(value)}`);
  }

  return value;
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!isRecord(value) || !isRecord(value['user'])) {
    return false;
  }

  return (
    typeof value['accessToken'] === 'string' &&
    typeof value['refreshToken'] === 'string' &&
    typeof value['expiresIn'] === 'number' &&
    typeof value['user']['id'] === 'string' &&
    typeof value['user']['fullName'] === 'string' &&
    typeof value['user']['role'] === 'string'
  );
}

function isCurrentUserResponse(value: unknown): value is CurrentUserResponse {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['email'] === 'string' &&
    typeof value['phone'] === 'string' &&
    typeof value['fullName'] === 'string' &&
    typeof value['role'] === 'string' &&
    typeof value['status'] === 'string'
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    typeof value['error'] === 'string' &&
    typeof value['statusCode'] === 'number' &&
    typeof value['message'] === 'string'
  );
}

function findOtpCodeInLogs(logLines: readonly string[], phone: string): string {
  for (const line of [...logLines].reverse()) {
    const parsed = parseJson(line);

    if (!isRecord(parsed)) {
      continue;
    }

    if (
      typeof parsed['msg'] === 'string' &&
      parsed['msg'].includes('OTP code') &&
      parsed['phone'] === phone
    ) {
      return stringProperty(parsed, 'code');
    }
  }

  throw new Error(`OTP code for ${phone} was not found in API logs`);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function recordFrom(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Expected record, got ${JSON.stringify(value)}`);
  }

  return value;
}

function stringProperty(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected string property ${key}`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function waitForProcessExit(
  childProcess: ChildProcessWithoutNullStreams,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolveExit, rejectExit) => {
    const timeout = setTimeout(() => {
      cleanup();
      rejectExit(new Error('API process did not exit in time'));
    }, timeoutMs);
    const cleanup = (): void => {
      clearTimeout(timeout);
      childProcess.off('exit', onExit);
      childProcess.off('error', onError);
    };
    const onExit = (): void => {
      cleanup();
      resolveExit();
    };
    const onError = (error: Error): void => {
      cleanup();
      rejectExit(error);
    };

    childProcess.on('exit', onExit);
    childProcess.on('error', onError);
  });
}

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();

    server.on('error', rejectPort);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!isAddressInfo(address)) {
        server.close();
        rejectPort(new Error('Failed to allocate TCP port'));
        return;
      }

      const { port } = address;

      server.close((error) => {
        if (error) {
          rejectPort(error);
          return;
        }

        resolvePort(port);
      });
    });
  });
}

function isAddressInfo(value: string | AddressInfo | null): value is AddressInfo {
  return typeof value === 'object' && value !== null && typeof value.port === 'number';
}
