import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

import { Client } from 'pg';
import request from 'supertest';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

import type { AddressInfo } from 'node:net';

const JWT_SECRET =
  'test-secret-key-that-is-long-enough-for-hs512-algorithm-at-least-64-bytes-long!!';
const UNSUBSCRIBE_SECRET = 'e2e-unsubscribe-secret';
const TEST_TIMEOUT = 60_000;
const WORKSPACE_ROOT = resolve(__dirname, '../../../../..');
const API_ENTRYPOINT = resolve(WORKSPACE_ROOT, 'dist/apps/backend/api/main.js');
const supertest = request;

interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly user: { readonly id: string; readonly fullName: string; readonly role: string };
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
        UNSUBSCRIBE_SECRET,
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
    if (this.exitDescription !== null) {
      throw new Error(`API process stopped (${this.exitDescription}). Logs:\n${this.logsText()}`);
    }
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
        if (this.logLines.some((l) => l.includes('Nest application successfully started'))) {
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

describe('Backend API Notifications e2e', () => {
  let pgContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let client: Client;
  let api: ApiProcess;

  beforeAll(async () => {
    const [pg, redis] = await Promise.all([
      new GenericContainer('postgres:16-alpine')
        .withEnvironment({
          POSTGRES_DB: 'ntf_e2e',
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
    )}/ntf_e2e`;

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

  describe('GET /api/me/notifications', () => {
    it('returns empty list for authenticated user', async () => {
      const owner = await registerAndLogin();

      const res = await supertest(api.baseUrl)
        .get('/api/me/notifications')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const body = recordFrom(res.body);

      expect(body['items']).toEqual([]);
      expect(body['nextCursor']).toBeNull();
    });

    it('returns notifications seeded in DB for user', async () => {
      const owner = await registerAndLogin();

      await seedNotification(client, owner.user.id, {
        channel: 'EMAIL',
        status: 'SENT',
        templateCode: 'USER_REGISTERED',
      });

      const res = await supertest(api.baseUrl)
        .get('/api/me/notifications')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const body = recordFrom(res.body);
      const items = body['items'] as unknown[];

      expect(items).toHaveLength(1);

      const item = recordFrom(items[0]);

      expect(item['templateCode']).toBe('USER_REGISTERED');
      expect(item['channel']).toBe('EMAIL');
      expect(item['status']).toBe('SENT');
    });

    it('rejects unauthenticated requests', async () => {
      await supertest(api.baseUrl).get('/api/me/notifications').expect(401);
    });
  });

  describe('GET /api/me/notifications/preferences', () => {
    it('returns default preferences for new user', async () => {
      const owner = await registerAndLogin();

      const res = await supertest(api.baseUrl)
        .get('/api/me/notifications/preferences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const body = recordFrom(res.body);

      expect(body['channelsByTemplate']).toBeDefined();
      expect(body['quietHours']).toBeNull();
      expect(body['unsubscribedChannels']).toEqual([]);

      const cbt = body['channelsByTemplate'] as Record<string, unknown>;

      expect(cbt['APPOINTMENT_CONFIRMED']).toBeDefined();
      expect(cbt['USER_REGISTERED']).toBeDefined();
    });
  });

  describe('PUT /api/me/notifications/preferences', () => {
    it('updates quiet hours', async () => {
      const owner = await registerAndLogin();

      await supertest(api.baseUrl)
        .put('/api/me/notifications/preferences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          quietHours: {
            startMinuteOfDay: 1320,
            endMinuteOfDay: 480,
            timezone: 'Europe/Moscow',
          },
        })
        .expect(200);

      const res = await supertest(api.baseUrl)
        .get('/api/me/notifications/preferences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const body = recordFrom(res.body);
      const qh = recordFrom(body['quietHours']);

      expect(qh['startMinuteOfDay']).toBe(1320);
      expect(qh['endMinuteOfDay']).toBe(480);
      expect(qh['timezone']).toBe('Europe/Moscow');
    });

    it('updates channels by template', async () => {
      const owner = await registerAndLogin();

      await supertest(api.baseUrl)
        .put('/api/me/notifications/preferences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          channelsByTemplate: {
            WORK_ORDER_COMPLETED: ['PUSH'],
          },
        })
        .expect(200);

      const res = await supertest(api.baseUrl)
        .get('/api/me/notifications/preferences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const cbt = recordFrom(res.body)['channelsByTemplate'] as Record<string, unknown>;

      expect(cbt['WORK_ORDER_COMPLETED']).toEqual(['PUSH']);
    });
  });

  describe('POST /api/me/push-subscriptions', () => {
    it('saves a push subscription', async () => {
      const owner = await registerAndLogin();

      await supertest(api.baseUrl)
        .post('/api/me/push-subscriptions')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-test-1',
          keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-key' },
          userAgent: 'E2E Test Agent',
        })
        .expect(201);

      const rows = await client.query(`select * from ntf_push_subscription where user_id = $1`, [
        owner.user.id,
      ]);

      expect(rows.rowCount).toBe(1);
    });

    it('upserts on duplicate endpoint', async () => {
      const owner = await registerAndLogin();
      const endpoint = 'https://fcm.googleapis.com/fcm/send/e2e-upsert';

      await supertest(api.baseUrl)
        .post('/api/me/push-subscriptions')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          endpoint,
          keys: { p256dh: 'key-v1', auth: 'auth-v1' },
        })
        .expect(201);

      await supertest(api.baseUrl)
        .post('/api/me/push-subscriptions')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          endpoint,
          keys: { p256dh: 'key-v2', auth: 'auth-v2' },
        })
        .expect(201);

      const rows = await client.query(
        `select p256dh from ntf_push_subscription where endpoint = $1`,
        [endpoint],
      );

      expect(rows.rowCount).toBe(1);
      expect((rows.rows[0] as Record<string, unknown>)['p256dh']).toBe('key-v2');
    });

    it('rejects invalid body', async () => {
      const owner = await registerAndLogin();

      await supertest(api.baseUrl)
        .post('/api/me/push-subscriptions')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ endpoint: 'not-a-url' })
        .expect(400);
    });
  });

  describe('DELETE /api/me/push-subscriptions/:id', () => {
    it('deletes own push subscription', async () => {
      const owner = await registerAndLogin();
      const subId = '11111111-1111-4111-8111-111111111111';

      await client.query(
        `insert into ntf_push_subscription (id, user_id, endpoint, p256dh, auth, created_at)
         values ($1, $2, 'https://push.example.com/del', 'p', 'a', now())`,
        [subId, owner.user.id],
      );

      await supertest(api.baseUrl)
        .delete(`/api/me/push-subscriptions/${subId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);

      const rows = await client.query(
        `select expired_at from ntf_push_subscription where id = $1`,
        [subId],
      );

      expect(rows.rowCount).toBe(1);
      expect(rows.rows[0].expired_at).not.toBeNull();
    });

    it('returns 404 for non-existent subscription', async () => {
      const owner = await registerAndLogin();
      const fakeId = '22222222-2222-4222-8222-222222222222';

      await supertest(api.baseUrl)
        .delete(`/api/me/push-subscriptions/${fakeId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });
  });

  describe('GET /api/unsubscribe', () => {
    it('returns HTML for browser requests with valid token', async () => {
      const owner = await registerAndLogin();
      const token = generateTestUnsubscribeToken(owner.user.id, 'EMAIL');

      const res = await supertest(api.baseUrl)
        .get('/api/unsubscribe')
        .query({ token })
        .set('Accept', 'text/html')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Вы успешно отписаны');
    });

    it('returns JSON for API requests with valid token', async () => {
      const owner = await registerAndLogin();
      const token = generateTestUnsubscribeToken(owner.user.id, 'SMS');

      const res = await supertest(api.baseUrl)
        .get('/api/unsubscribe')
        .query({ token })
        .set('Accept', 'application/json')
        .expect(200);

      const body = recordFrom(res.body);

      expect(body['ok']).toBe(true);
    });

    it('rejects invalid token', async () => {
      await supertest(api.baseUrl)
        .get('/api/unsubscribe')
        .query({ token: 'invalid.token' })
        .expect(400);
    });
  });

  describe('GET /api/admin/notifications', () => {
    it('OWNER can list all notifications', async () => {
      const owner = await registerAndLogin();

      await seedNotification(client, owner.user.id, {
        channel: 'SMS',
        status: 'SENT',
        templateCode: 'LOW_STOCK',
      });

      const res = await supertest(api.baseUrl)
        .get('/api/admin/notifications')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const body = recordFrom(res.body);
      const items = body['items'] as unknown[];

      expect(items).toHaveLength(1);
    });

    it('CLIENT cannot access admin notifications', async () => {
      const clientUser = await registerClient();

      await supertest(api.baseUrl)
        .get('/api/admin/notifications')
        .set('Authorization', `Bearer ${clientUser.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/notifications/failed', () => {
    it('returns only FAILED notifications', async () => {
      const owner = await registerAndLogin();

      await seedNotification(client, owner.user.id, {
        channel: 'EMAIL',
        status: 'FAILED',
        templateCode: 'USER_REGISTERED',
      });
      await seedNotification(client, owner.user.id, {
        channel: 'EMAIL',
        status: 'SENT',
        templateCode: 'APPOINTMENT_CONFIRMED',
      });

      const res = await supertest(api.baseUrl)
        .get('/api/admin/notifications/failed')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const items = res.body as unknown[];

      expect(items).toHaveLength(1);

      const item = recordFrom(items[0]);

      expect(item['status']).toBe('FAILED');
    });
  });

  describe('POST /api/admin/notifications/:id/retry', () => {
    it('OWNER can retry a FAILED notification', async () => {
      const owner = await registerAndLogin();

      const notifId = await seedNotification(client, owner.user.id, {
        channel: 'EMAIL',
        status: 'FAILED',
        templateCode: 'USER_REGISTERED',
      });

      await supertest(api.baseUrl)
        .post(`/api/admin/notifications/${notifId}/retry`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      const rows = await client.query(
        `select status from ntf_notification where id != $1 order by created_at desc limit 1`,
        [notifId],
      );

      expect(rows.rowCount).toBeGreaterThanOrEqual(1);
      expect((rows.rows[0] as Record<string, unknown>)['status']).toBe('PENDING');
    });

    it('returns 404 for non-existent notification', async () => {
      const owner = await registerAndLogin();
      const fakeId = '33333333-3333-4333-8333-333333333333';

      await supertest(api.baseUrl)
        .post(`/api/admin/notifications/${fakeId}/retry`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });

    it('returns 422 for non-FAILED notification', async () => {
      const owner = await registerAndLogin();

      const notifId = await seedNotification(client, owner.user.id, {
        channel: 'EMAIL',
        status: 'SENT',
        templateCode: 'USER_REGISTERED',
      });

      await supertest(api.baseUrl)
        .post(`/api/admin/notifications/${notifId}/retry`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(422);
    });

    it('CLIENT cannot retry notifications', async () => {
      const clientUser = await registerClient();
      const fakeId = '44444444-4444-4444-8444-444444444444';

      await supertest(api.baseUrl)
        .post(`/api/admin/notifications/${fakeId}/retry`)
        .set('Authorization', `Bearer ${clientUser.accessToken}`)
        .expect(403);
    });
  });

  let userCounter = 0;

  function nextUser(): { email: string; phone: string } {
    userCounter++;

    return {
      email: `ntf-e2e-${String(userCounter)}@studio.test`,
      phone: `+7999100${String(userCounter).padStart(4, '0')}`,
    };
  }

  async function registerAndLogin(): Promise<LoginResponse> {
    const { email, phone } = nextUser();
    const res = await supertest(api.baseUrl)
      .post('/api/auth/register-owner')
      .send({ email, fullName: 'Owner E2E', password: 'Str0ngP@ss', phone })
      .expect(201);

    return loginResponseFrom(res.body);
  }

  async function registerClient(): Promise<LoginResponse> {
    const { email, phone } = nextUser();

    await supertest(api.baseUrl)
      .post('/api/auth/register-owner')
      .send({ email, fullName: 'Client E2E', password: 'Str0ngP@ss', phone })
      .expect(201);

    await client.query(`update iam_user set role_set = '["CLIENT"]' where email = $1`, [email]);

    const loginRes = await supertest(api.baseUrl)
      .post('/api/auth/login')
      .send({ email, password: 'Str0ngP@ss' })
      .expect(200);

    return loginResponseFrom(loginRes.body);
  }
});

function generateTestUnsubscribeToken(userId: string, channel: string): string {
  const payload = JSON.stringify({ uid: userId, ch: channel, iat: Date.now() });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = createHmac('sha256', UNSUBSCRIBE_SECRET).update(encoded).digest('base64url');

  return `${encoded}.${sig}`;
}

async function seedNotification(
  pgClient: Client,
  userId: string,
  opts: { templateCode: string; channel: string; status: string },
): Promise<string> {
  const id = randomUUID();

  await pgClient.query(
    `insert into ntf_notification
     (id, recipient_kind, recipient_user_id, template_code, channel, payload, status, attempts, created_at, expires_at)
     values ($1, 'user', $2, $3, $4, '{}', $5, '[]', now(), now() + interval '7 days')`,
    [id, userId, opts.templateCode, opts.channel, opts.status],
  );

  if (opts.status === 'FAILED') {
    await pgClient.query(`update ntf_notification set failed_at = now() where id = $1`, [id]);
  }

  if (opts.status === 'SENT') {
    await pgClient.query(`update ntf_notification set sent_at = now() where id = $1`, [id]);
  }

  return id;
}

async function runMigrations(pgClient: Client): Promise<void> {
  await pgClient.query(`
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

    -- Notifications tables
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
    CREATE INDEX IF NOT EXISTS idx_ntf_notification_status_scheduled ON ntf_notification (status, scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_ntf_notification_recipient_created ON ntf_notification (recipient_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ntf_notification_dedup_created ON ntf_notification (dedup_scope_key, created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_ntf_push_sub_user_id ON ntf_push_subscription (user_id);

    CREATE TABLE IF NOT EXISTS ntf_notification_dedup_key (
      scope_key TEXT PRIMARY KEY,
      template_code TEXT NOT NULL,
      last_issued_at TIMESTAMPTZ NOT NULL,
      window_ends_at TIMESTAMPTZ NOT NULL
    );
  `);

  await seedNotificationTemplates(pgClient);
}

async function seedNotificationTemplates(pgClient: Client): Promise<void> {
  const templates: Array<{ code: string; title: string; channels: string; critical: boolean }> = [
    {
      code: 'APPOINTMENT_CONFIRMED',
      title: 'Запись подтверждена',
      channels: '["EMAIL","SMS","TELEGRAM","PUSH"]',
      critical: false,
    },
    {
      code: 'APPOINTMENT_REMINDER',
      title: 'Напоминание',
      channels: '["SMS","PUSH"]',
      critical: false,
    },
    {
      code: 'APPOINTMENT_CANCELLED',
      title: 'Запись отменена',
      channels: '["EMAIL","SMS","TELEGRAM","PUSH"]',
      critical: true,
    },
    {
      code: 'APPOINTMENT_RESCHEDULED',
      title: 'Перенесена',
      channels: '["EMAIL","SMS","TELEGRAM","PUSH"]',
      critical: true,
    },
    {
      code: 'WORK_ORDER_COMPLETED',
      title: 'Наряд завершён',
      channels: '["EMAIL","PUSH"]',
      critical: false,
    },
    {
      code: 'CANCELLATION_REQUEST_NEW',
      title: 'Заявка на отмену',
      channels: '["EMAIL","TELEGRAM","PUSH"]',
      critical: false,
    },
    {
      code: 'LOW_STOCK',
      title: 'Низкий остаток',
      channels: '["EMAIL","TELEGRAM"]',
      critical: false,
    },
    {
      code: 'OWNER_DIGEST_DAILY',
      title: 'Сводка',
      channels: '["EMAIL","TELEGRAM"]',
      critical: false,
    },
    {
      code: 'USER_REGISTERED',
      title: 'Регистрация',
      channels: '["EMAIL"]',
      critical: false,
    },
    {
      code: 'INVITATION_ISSUED',
      title: 'Приглашение',
      channels: '["EMAIL"]',
      critical: false,
    },
  ];

  for (const t of templates) {
    await pgClient.query(
      `INSERT INTO ntf_notification_template (code, title, body_by_channel, default_channels, is_critical, updated_at)
       VALUES ($1, $2, '{}', $3::jsonb, $4, NOW())
       ON CONFLICT (code) DO NOTHING`,
      [t.code, t.title, t.channels, t.critical],
    );
  }
}

async function resetDatabase(pgClient: Client): Promise<void> {
  await pgClient.query(`
    truncate table
      "ntf_notification_dedup_key",
      "ntf_push_subscription",
      "ntf_user_notification_preferences",
      "ntf_notification",
      "iam_refresh_session",
      "iam_otp_request",
      "iam_invitation",
      "iam_user",
      "outbox_events"
  `);
  await seedNotificationTemplates(pgClient);
}

function loginResponseFrom(value: unknown): LoginResponse {
  if (!isLoginResponse(value)) {
    throw new Error(`Expected login response, got ${JSON.stringify(value)}`);
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
    typeof value['user']['role'] === 'string'
  );
}

function recordFrom(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Expected record, got ${JSON.stringify(value)}`);
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
