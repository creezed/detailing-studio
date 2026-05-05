/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @nx/enforce-module-boundaries */
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
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

  it(
    'register-owner → login → GET /users/me',
    async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register-owner')
        .send({
          email: 'owner@studio.test',
          fullName: 'Иванов Иван',
          password: 'Str0ngP@ss',
          phone: '+79991234567',
        })
        .expect(201);

      expect(registerRes.body).toHaveProperty('accessToken');
      expect(registerRes.body).toHaveProperty('refreshToken');
      expect(registerRes.body.user.role).toBe('OWNER');

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          deviceFingerprint: 'fp-1',
          email: 'owner@studio.test',
          password: 'Str0ngP@ss',
        })
        .expect(200);

      const { accessToken } = loginRes.body as { accessToken: string };

      const meRes = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.email).toBe('owner@studio.test');
      expect(meRes.body.fullName).toBe('Иванов Иван');
      expect(meRes.body.role).toBe('OWNER');
      expect(meRes.body.status).toBe('ACTIVE');
    },
    TEST_TIMEOUT,
  );

  it('blocked user cannot login', async () => {
    await pgClient.query(
      `UPDATE iam_users SET status = 'BLOCKED' WHERE email = 'owner@studio.test'`,
    );

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        deviceFingerprint: 'fp-2',
        email: 'owner@studio.test',
        password: 'Str0ngP@ss',
      })
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

    CREATE TABLE IF NOT EXISTS "iam_users" (
      "id" uuid NOT NULL,
      "email" text NULL,
      "phone" text NOT NULL,
      "password_hash" text NULL,
      "full_name" text NOT NULL,
      "role" text NOT NULL,
      "status" text NOT NULL DEFAULT 'ACTIVE',
      "branch_ids" jsonb NOT NULL DEFAULT '[]',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "iam_users_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "iam_users_email_unique" UNIQUE ("email"),
      CONSTRAINT "iam_users_phone_unique" UNIQUE ("phone")
    );

    CREATE TABLE IF NOT EXISTS "iam_invitations" (
      "id" uuid NOT NULL,
      "email" text NOT NULL,
      "phone" text NULL,
      "full_name" text NULL,
      "role" text NOT NULL,
      "branch_ids" jsonb NOT NULL DEFAULT '[]',
      "token_hash" text NOT NULL,
      "status" text NOT NULL DEFAULT 'PENDING',
      "expires_at" timestamptz NOT NULL,
      "invited_by" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "iam_invitations_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "iam_invitations_token_hash_unique" UNIQUE ("token_hash")
    );

    CREATE TABLE IF NOT EXISTS "iam_otp_requests" (
      "id" uuid NOT NULL,
      "phone" text NOT NULL,
      "code_hash" text NOT NULL,
      "purpose" text NOT NULL,
      "status" text NOT NULL DEFAULT 'PENDING',
      "attempts" int NOT NULL DEFAULT 0,
      "expires_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "iam_otp_requests_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "iam_refresh_sessions" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "token_hash" text NOT NULL,
      "previous_token_hash" text NULL,
      "device_fingerprint" text NOT NULL,
      "status" text NOT NULL DEFAULT 'ACTIVE',
      "expires_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "iam_refresh_sessions_pkey" PRIMARY KEY ("id")
    );
  `);
}
