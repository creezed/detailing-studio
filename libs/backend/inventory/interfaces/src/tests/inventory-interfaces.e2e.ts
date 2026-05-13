/* eslint-disable @nx/enforce-module-boundaries */
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { type ArgumentsHost, Catch, type ExceptionFilter, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import request from 'supertest';
import { GenericContainer, Wait } from 'testcontainers';

import { IamInfrastructureModule } from '@det/backend-iam-infrastructure';
import { IamInterfacesModule } from '@det/backend-iam-interfaces';
import { InventoryInfrastructureModule } from '@det/backend-inventory-infrastructure';
import { ApplicationError } from '@det/backend-shared-ddd';

import { InventoryInterfacesModule } from '../index';

import type { TestingModule } from '@nestjs/testing';
import type { StartedTestContainer } from 'testcontainers';

const JWT_SECRET =
  'test-secret-key-that-is-long-enough-for-hs512-algorithm-at-least-64-bytes-long!!';
const TEST_TIMEOUT = 60_000;
const OWNER_ID = '11111111-1111-4111-8111-111111111101';
const BRANCH_ID = '11111111-1111-4111-8111-111111111301';

interface HttpResponse {
  status(code: number): { send(body: unknown): void };
}

@Catch(ApplicationError)
class TestExceptionFilter implements ExceptionFilter<ApplicationError> {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<HttpResponse>().status(exception.httpStatus).send({
      error: exception.code,
      message: exception.message,
      statusCode: exception.httpStatus,
    });
  }
}

describe('Inventory Interfaces e2e', () => {
  let app: NestFastifyApplication;
  let container: StartedTestContainer;
  let pgClient: Client;
  let ownerToken: string;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_inv',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_USER: 'test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('ready to accept connections', 2))
      .start();

    const port = container.getMappedPort(5432);
    const host = container.getHost();
    const dbUrl = `postgres://test:test@${host}:${String(port)}/test_inv`;

    pgClient = new Client({ connectionString: dbUrl });
    await pgClient.connect();
    await runMigrations(pgClient);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              auth: { jwtAccessTtl: '15m', jwtSecret: JWT_SECRET },
              database: { url: dbUrl },
            }),
          ],
        }),
        MikroOrmModule.forRoot({
          autoLoadEntities: true,
          clientUrl: dbUrl,
          discovery: { warnWhenNoEntities: false },
          driver: PostgreSqlDriver,
          registerRequestContext: true,
        }),
        IamInfrastructureModule,
        IamInterfacesModule,
        InventoryInfrastructureModule,
        InventoryInterfacesModule,
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    app.useGlobalFilters(new TestExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    await seedUser(pgClient, OWNER_ID, 'owner@studio.test', 'Str0ngP@ss', 'OWNER');
    ownerToken = await loginAndGetToken(app, 'owner@studio.test', 'Str0ngP@ss');
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
    await pgClient.end();
    await container.stop();
  });

  describe('SKUs', () => {
    afterEach(async () => {
      await pgClient.query('DELETE FROM "inv_packaging"');
      await pgClient.query('DELETE FROM "inv_sku"');
    });

    it('OWNER can create and list SKUs', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/skus')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          articleNumber: 'ART-001',
          baseUnit: 'ML',
          description: 'Test SKU',
          group: 'Полироли',
          hasExpiry: false,
          name: 'Koch Nano Magic',
          packagings: [{ coefficient: 500, name: 'Бутылка' }],
        })
        .expect(201);

      expect((createRes.body as { id: string }).id).toBeDefined();

      const listRes = await request(app.getHttpServer())
        .get('/api/skus')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(listRes.body).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/skus').expect(401);
    });

    it('returns 400 on invalid body', async () => {
      await request(app.getHttpServer())
        .post('/api/skus')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Suppliers', () => {
    afterEach(async () => {
      await pgClient.query('DELETE FROM "inv_supplier"');
    });

    it('OWNER can create a supplier', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          contact: { address: 'г. Москва', email: 's@test.com', phone: '+79991234567' },
          inn: '7710140679',
          name: 'Koch Chemie',
        })
        .expect(201);

      expect((res.body as { id: string }).id).toBeDefined();
    });
  });

  describe('Receipts', () => {
    let supplierId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          contact: { phone: '+79991234567' },
          name: 'Test Supplier',
        })
        .expect(201);
      supplierId = (res.body as { id: string }).id;
    });

    afterEach(async () => {
      await pgClient.query('DELETE FROM "inv_receipt_line"');
      await pgClient.query('DELETE FROM "inv_receipt"');
      await pgClient.query('DELETE FROM "inv_supplier"');
    });

    it('OWNER can create a receipt draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/receipts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ branchId: BRANCH_ID, supplierId })
        .expect(201);

      expect((res.body as { id: string }).id).toBeDefined();
    });
  });

  describe('Stock-takings', () => {
    it('returns 501 for PDF download', async () => {
      await request(app.getHttpServer())
        .get(`/api/stock-takings/${BRANCH_ID}/sheet.pdf`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(501);
    });
  });
});

async function loginAndGetToken(
  app: NestFastifyApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return (res.body as { accessToken: string }).accessToken;
}

async function seedUser(
  client: Client,
  id: string,
  email: string,
  password: string,
  role: string,
): Promise<void> {
  const hash = await bcrypt.hash(password, 12);
  await client.query(
    `INSERT INTO "iam_user" ("id","email","phone","password_hash","full_name","status","role_set","branch_ids","created_at","updated_at","version")
     VALUES ($1,$2,$3,$4,$5,'ACTIVE',$6::jsonb,$7::jsonb,now(),now(),1)`,
    [
      id,
      email,
      '+79990000001',
      hash,
      'Test Owner',
      JSON.stringify([role]),
      JSON.stringify([BRANCH_ID]),
    ],
  );
}

async function runMigrations(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "outbox_events" (
      "id" uuid NOT NULL, "aggregate_type" text NOT NULL, "aggregate_id" uuid NOT NULL,
      "event_type" text NOT NULL, "payload" jsonb NOT NULL, "occurred_at" timestamptz NOT NULL,
      "published_at" timestamptz NULL, "retry_count" int NOT NULL DEFAULT 0,
      "retry_after_at" timestamptz NULL, "failed_at" timestamptz NULL, "last_error" text NULL,
      CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "iam_user" (
      "id" uuid NOT NULL, "email" text NULL, "phone" text NULL, "password_hash" text NULL,
      "full_name" text NOT NULL, "status" text NOT NULL, "role_set" jsonb NOT NULL,
      "branch_ids" jsonb NOT NULL, "created_at" timestamptz NOT NULL, "updated_at" timestamptz NULL,
      "version" int NOT NULL DEFAULT 1, CONSTRAINT "iam_user_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "iam_user_email_unique" ON "iam_user" ("email") WHERE "email" IS NOT NULL;
    CREATE TABLE IF NOT EXISTS "iam_refresh_session" (
      "id" uuid NOT NULL, "user_id" uuid NOT NULL, "token_hash" text NOT NULL,
      "rotated_token_hashes" jsonb NOT NULL DEFAULT '[]'::jsonb, "rotation_counter" int NOT NULL DEFAULT 0,
      "status" text NOT NULL, "issued_at" timestamptz NOT NULL, "expires_at" timestamptz NOT NULL,
      "last_rotated_at" timestamptz NULL, "revoked_at" timestamptz NULL, "revoked_by" uuid NULL,
      "compromised_at" timestamptz NULL, "parent_session_id" uuid NULL,
      CONSTRAINT "iam_refresh_session_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "iam_invitation" (
      "id" uuid NOT NULL, "email" text NOT NULL, "role" text NOT NULL, "branch_ids" jsonb NOT NULL,
      "token_hash" text NOT NULL, "status" text NOT NULL, "issued_at" timestamptz NOT NULL,
      "expires_at" timestamptz NOT NULL, "accepted_at" timestamptz NULL, "revoked_at" timestamptz NULL,
      "invited_by" uuid NOT NULL, CONSTRAINT "iam_invitation_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "iam_otp_request" (
      "id" uuid NOT NULL, "phone" text NOT NULL, "purpose" text NOT NULL, "code_hash" text NOT NULL,
      "attempts_left" int NOT NULL, "status" text NOT NULL, "expires_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL, "verified_at" timestamptz NULL,
      CONSTRAINT "iam_otp_request_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_sku" (
      "id" uuid NOT NULL, "article_number" text NOT NULL, "name" text NOT NULL,
      "group" text NOT NULL, "base_unit" text NOT NULL, "barcode" text NULL,
      "has_expiry" boolean NOT NULL DEFAULT false, "photo_url" text NULL,
      "is_active" boolean NOT NULL DEFAULT true, "description_md" text NOT NULL DEFAULT '',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "inv_sku_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_sku_article" ON "inv_sku" ("article_number");
    CREATE TABLE IF NOT EXISTS "inv_packaging" (
      "id" uuid NOT NULL, "sku_id" uuid NOT NULL, "name" text NOT NULL, "coefficient" numeric NOT NULL,
      CONSTRAINT "inv_packaging_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inv_packaging_sku_fk" FOREIGN KEY ("sku_id") REFERENCES "inv_sku" ("id") ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "inv_supplier" (
      "id" uuid NOT NULL, "name" text NOT NULL, "inn" text NULL,
      "contact_name" text NULL, "contact_phone" text NULL, "contact_email" text NULL,
      "address" text NULL, "is_active" boolean NOT NULL DEFAULT true,
      CONSTRAINT "inv_supplier_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_stock" (
      "id" uuid NOT NULL, "sku_id" uuid NOT NULL, "branch_id" uuid NOT NULL,
      "base_unit" text NOT NULL, "reorder_level" numeric(18,4) NOT NULL DEFAULT 0,
      "average_cost_cents" bigint NOT NULL DEFAULT 0, "updated_at" timestamptz NOT NULL DEFAULT now(),
      "version" int NOT NULL DEFAULT 1, CONSTRAINT "inv_stock_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_batch" (
      "id" uuid NOT NULL, "stock_id" uuid NOT NULL, "supplier_id" uuid NULL,
      "source_type" text NOT NULL, "source_doc_id" uuid NOT NULL,
      "initial_quantity" numeric(18,4) NOT NULL, "remaining_quantity" numeric(18,4) NOT NULL,
      "unit_cost_cents" bigint NOT NULL, "expires_at" date NULL, "received_at" timestamptz NOT NULL,
      CONSTRAINT "inv_batch_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inv_batch_stock_fk" FOREIGN KEY ("stock_id") REFERENCES "inv_stock" ("id") ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "inv_stock_movement" (
      "id" uuid NOT NULL, "stock_id" uuid NOT NULL, "batch_id" uuid NULL,
      "movement_type" text NOT NULL, "delta" numeric(18,4) NOT NULL, "cost_cents" bigint NOT NULL,
      "reason" text NULL, "source_type" text NOT NULL, "source_doc_id" uuid NOT NULL,
      "actor_user_id" uuid NULL, "occurred_at" timestamptz NOT NULL,
      CONSTRAINT "inv_stock_movement_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inv_stock_movement_stock_fk" FOREIGN KEY ("stock_id") REFERENCES "inv_stock" ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_receipt" (
      "id" uuid NOT NULL, "supplier_id" uuid NOT NULL, "branch_id" uuid NOT NULL,
      "supplier_invoice_number" text NULL, "supplier_invoice_date" date NULL,
      "status" text NOT NULL, "attachment_url" text NULL, "created_by" uuid NOT NULL,
      "posted_by" uuid NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "posted_at" timestamptz NULL,
      CONSTRAINT "inv_receipt_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_receipt_line" (
      "id" uuid NOT NULL, "receipt_id" uuid NOT NULL, "sku_id" uuid NOT NULL,
      "packaging_id" uuid NULL, "package_quantity" numeric(18,4) NOT NULL,
      "base_quantity" numeric(18,4) NOT NULL, "unit_cost_cents" bigint NOT NULL, "expires_at" date NULL,
      CONSTRAINT "inv_receipt_line_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inv_receipt_line_receipt_fk" FOREIGN KEY ("receipt_id") REFERENCES "inv_receipt" ("id") ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "inv_adjustment" (
      "id" uuid NOT NULL, "branch_id" uuid NOT NULL, "status" text NOT NULL,
      "reason" text NOT NULL, "total_amount_cents" bigint NOT NULL DEFAULT 0,
      "created_by" uuid NOT NULL, "approved_by" uuid NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), "approved_at" timestamptz NULL,
      CONSTRAINT "inv_adjustment_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_adjustment_line" (
      "id" uuid NOT NULL, "adjustment_id" uuid NOT NULL, "sku_id" uuid NOT NULL,
      "delta" numeric(18,4) NOT NULL, "snapshot_unit_cost_cents" bigint NOT NULL,
      CONSTRAINT "inv_adjustment_line_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inv_adjustment_line_adj_fk" FOREIGN KEY ("adjustment_id") REFERENCES "inv_adjustment" ("id") ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "inv_transfer" (
      "id" uuid NOT NULL, "from_branch_id" uuid NOT NULL, "to_branch_id" uuid NOT NULL,
      "status" text NOT NULL, "created_by" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), "posted_by" uuid NULL, "posted_at" timestamptz NULL,
      CONSTRAINT "inv_transfer_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_transfer_line" (
      "id" uuid NOT NULL, "transfer_id" uuid NOT NULL, "sku_id" uuid NOT NULL,
      "quantity" numeric(18,4) NOT NULL, "base_unit" text NOT NULL,
      CONSTRAINT "inv_transfer_line_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inv_transfer_line_fk" FOREIGN KEY ("transfer_id") REFERENCES "inv_transfer" ("id") ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "inv_stock_taking" (
      "id" uuid NOT NULL, "branch_id" uuid NOT NULL, "status" text NOT NULL,
      "started_at" timestamptz NOT NULL DEFAULT now(), "completed_at" timestamptz NULL,
      "created_by" uuid NOT NULL, CONSTRAINT "inv_stock_taking_pkey" PRIMARY KEY ("id")
    );
    CREATE TABLE IF NOT EXISTS "inv_stock_taking_line" (
      "id" uuid NOT NULL, "stock_taking_id" uuid NOT NULL, "sku_id" uuid NOT NULL,
      "expected_quantity" numeric(18,4) NOT NULL, "actual_quantity" numeric(18,4) NULL,
      "base_unit" text NOT NULL, CONSTRAINT "inv_stock_taking_line_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inv_stock_taking_line_fk" FOREIGN KEY ("stock_taking_id") REFERENCES "inv_stock_taking" ("id") ON DELETE CASCADE
    );
  `);
}
