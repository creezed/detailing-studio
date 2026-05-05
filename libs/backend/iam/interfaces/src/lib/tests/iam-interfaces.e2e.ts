/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @nx/enforce-module-boundaries */
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import request from 'supertest';
import { GenericContainer, Wait } from 'testcontainers';

import { IamInfrastructureModule } from '@det/backend/iam/infrastructure';

import { IamInterfacesModule } from '../../index';

import type { TestingModule } from '@nestjs/testing';
import type { StartedTestContainer } from 'testcontainers';

const JWT_SECRET =
  'test-secret-key-that-is-long-enough-for-hs512-algorithm-at-least-64-bytes-long!!';
const TEST_TIMEOUT = 60_000;
const BRANCH_ID = '11111111-1111-4111-8111-111111111101';
const MANAGER_ID = '11111111-1111-4111-8111-111111111201';
const TARGET_USER_ID = '11111111-1111-4111-8111-111111111202';

describe('IAM Interfaces e2e', () => {
  let app: NestFastifyApplication;
  let container: StartedTestContainer;
  let pgClient: Client;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_iam',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_USER: 'test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('ready to accept connections', 2))
      .start();

    const port = container.getMappedPort(5432);
    const host = container.getHost();
    const databaseUrl = `postgres://test:test@${host}:${String(port)}/test_iam`;

    pgClient = new Client({ connectionString: databaseUrl });
    await pgClient.connect();
    await runMigrations(pgClient);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              auth: {
                jwtAccessTtl: '15m',
                jwtSecret: JWT_SECRET,
              },
              database: { url: databaseUrl },
            }),
          ],
        }),
        MikroOrmModule.forRoot({
          autoLoadEntities: true,
          clientUrl: databaseUrl,
          discovery: { warnWhenNoEntities: false },
          driver: PostgreSqlDriver,
        }),
        IamInfrastructureModule,
        IamInterfacesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
    await pgClient.end();
    await container.stop();
  });

  afterEach(async () => {
    await resetDatabase(pgClient);
  });

  it(
    'register-owner → login → GET /users/me',
    async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register-owner')
        .send({
          email: 'owner-profile@studio.test',
          fullName: 'Иванов Иван',
          password: 'Str0ngP@ss',
          phone: '+79991234567',
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          deviceFingerprint: 'fp-1',
          email: 'owner-profile@studio.test',
          password: 'Str0ngP@ss',
        })
        .expect(200);

      const { accessToken } = loginRes.body as { accessToken: string };

      const meRes = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.email).toBe('owner-profile@studio.test');
      expect(meRes.body.fullName).toBe('Иванов Иван');
      expect(meRes.body.role).toBe('OWNER');
      expect(meRes.body.status).toBe('ACTIVE');
    },
    TEST_TIMEOUT,
  );

  it('blocked user cannot login', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register-owner')
      .send({
        email: 'blocked-owner@studio.test',
        fullName: 'Петров Пётр',
        password: 'Str0ngP@ss',
        phone: '+79991234568',
      })
      .expect(201);

    await pgClient.query(`UPDATE iam_user SET status = 'BLOCKED' WHERE email = $1`, [
      'blocked-owner@studio.test',
    ]);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        deviceFingerprint: 'fp-2',
        email: 'blocked-owner@studio.test',
        password: 'Str0ngP@ss',
      })
      .expect(403);
  });

  it('manager cannot block another user', async () => {
    await seedUser(pgClient, {
      branchIds: [BRANCH_ID],
      email: 'manager-block@studio.test',
      fullName: 'Менеджер',
      id: MANAGER_ID,
      password: 'Str0ngP@ss',
      phone: '+79991234569',
      role: 'MANAGER',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        deviceFingerprint: 'fp-manager',
        email: 'manager-block@studio.test',
        password: 'Str0ngP@ss',
      })
      .expect(200);

    const { accessToken } = loginRes.body as { accessToken: string };

    await request(app.getHttpServer())
      .post(`/api/users/${TARGET_USER_ID}/block`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'RBAC check' })
      .expect(403);
  });
});

async function runMigrations(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "outbox_events" (
      "id" uuid NOT NULL,
      "aggregate_type" text NOT NULL,
      "aggregate_id" uuid NOT NULL,
      "event_type" text NOT NULL,
      "payload" jsonb NOT NULL,
      "occurred_at" timestamptz NOT NULL,
      "published_at" timestamptz NULL,
      "retry_count" int NOT NULL DEFAULT 0,
      "retry_after_at" timestamptz NULL,
      "failed_at" timestamptz NULL,
      "last_error" text NULL,
      CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "idx_outbox_unpublished" ON "outbox_events" ("occurred_at") WHERE "published_at" IS NULL;

    CREATE TABLE IF NOT EXISTS "iam_user" (
      "id" uuid NOT NULL,
      "email" text NULL,
      "phone" text NULL,
      "password_hash" text NULL,
      "full_name" text NOT NULL,
      "status" text NOT NULL,
      "role_set" jsonb NOT NULL,
      "branch_ids" jsonb NOT NULL,
      "created_at" timestamptz NOT NULL,
      "updated_at" timestamptz NULL,
      "version" int NOT NULL DEFAULT 1,
      CONSTRAINT "iam_user_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "iam_user_email_unique" ON "iam_user" ("email") WHERE "email" IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "iam_user_phone_unique" ON "iam_user" ("phone") WHERE "phone" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "idx_iam_user_status" ON "iam_user" ("status");

    CREATE TABLE IF NOT EXISTS "iam_invitation" (
      "id" uuid NOT NULL,
      "email" text NOT NULL,
      "role" text NOT NULL,
      "branch_ids" jsonb NOT NULL,
      "token_hash" text NOT NULL,
      "status" text NOT NULL,
      "issued_at" timestamptz NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "accepted_at" timestamptz NULL,
      "revoked_at" timestamptz NULL,
      "invited_by" uuid NOT NULL,
      CONSTRAINT "iam_invitation_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "iam_invitation_token_hash_unique" ON "iam_invitation" ("token_hash");
    CREATE INDEX IF NOT EXISTS "idx_iam_invitation_email_status" ON "iam_invitation" ("email", "status");

    CREATE TABLE IF NOT EXISTS "iam_otp_request" (
      "id" uuid NOT NULL,
      "phone" text NOT NULL,
      "purpose" text NOT NULL,
      "code_hash" text NOT NULL,
      "attempts_left" int NOT NULL,
      "status" text NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL,
      "verified_at" timestamptz NULL,
      CONSTRAINT "iam_otp_request_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "idx_iam_otp_request_phone_purpose_status" ON "iam_otp_request" ("phone", "purpose", "status");

    CREATE TABLE IF NOT EXISTS "iam_refresh_session" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "device_fingerprint" text NULL,
      "token_hash" text NOT NULL,
      "rotated_token_hashes" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "rotation_counter" int NOT NULL DEFAULT 0,
      "status" text NOT NULL,
      "issued_at" timestamptz NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "last_rotated_at" timestamptz NULL,
      "revoked_at" timestamptz NULL,
      "revoked_by" uuid NULL,
      "compromised_at" timestamptz NULL,
      "parent_session_id" uuid NULL,
      CONSTRAINT "iam_refresh_session_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "idx_iam_refresh_session_user_status" ON "iam_refresh_session" ("user_id", "status");
    CREATE INDEX IF NOT EXISTS "idx_iam_refresh_session_token_hash" ON "iam_refresh_session" ("token_hash");
    CREATE INDEX IF NOT EXISTS "idx_iam_refresh_session_rotated_hashes" ON "iam_refresh_session" USING gin ("rotated_token_hashes");
  `);
}

async function resetDatabase(client: Client): Promise<void> {
  await client.query(
    `TRUNCATE TABLE "iam_refresh_session", "iam_otp_request", "iam_invitation", "iam_user", "outbox_events"`,
  );
}

interface SeedUser {
  readonly id: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
  readonly fullName: string;
  readonly role: 'OWNER' | 'MANAGER' | 'MASTER' | 'CLIENT';
  readonly branchIds: readonly string[];
}

async function seedUser(client: Client, user: SeedUser): Promise<void> {
  const passwordHash = await bcrypt.hash(user.password, 12);

  await client.query(
    `
      INSERT INTO "iam_user" (
        "id",
        "email",
        "phone",
        "password_hash",
        "full_name",
        "status",
        "role_set",
        "branch_ids",
        "created_at",
        "updated_at",
        "version"
      )
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6::jsonb, $7::jsonb, now(), now(), 1)
    `,
    [
      user.id,
      user.email,
      user.phone,
      passwordHash,
      user.fullName,
      JSON.stringify([user.role]),
      JSON.stringify(user.branchIds),
    ],
  );
}
