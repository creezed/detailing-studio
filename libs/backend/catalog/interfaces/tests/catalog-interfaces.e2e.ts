/* eslint-disable @nx/enforce-module-boundaries */
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager, PostgreSqlDriver } from '@mikro-orm/postgresql';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Injectable,
  ValidationPipe,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import { from, lastValueFrom, type Observable } from 'rxjs';
import request from 'supertest';
import { GenericContainer, Wait } from 'testcontainers';

import { CatalogInfrastructureModule } from '@det/backend/catalog/infrastructure';
import { IamInfrastructureModule } from '@det/backend/iam/infrastructure';
import { IamInterfacesModule } from '@det/backend/iam/interfaces';
import { ApplicationError } from '@det/backend/shared/ddd';

import { CatalogInterfacesModule } from '../index';

import type { TestingModule } from '@nestjs/testing';
import type { StartedTestContainer } from 'testcontainers';

const JWT_SECRET =
  'test-secret-key-that-is-long-enough-for-hs512-algorithm-at-least-64-bytes-long!!';
const TEST_TIMEOUT = 60_000;
const OWNER_ID = '11111111-1111-4111-8111-111111111101';
const MANAGER_ID = '11111111-1111-4111-8111-111111111201';
const BRANCH_ID = '11111111-1111-4111-8111-111111111301';

interface ErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly statusCode: number;
}

interface HttpResponse {
  status(code: number): {
    send(body: ErrorResponse): void;
  };
}

@Catch(ApplicationError)
class TestApplicationExceptionFilter implements ExceptionFilter<ApplicationError> {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<HttpResponse>().status(exception.httpStatus).send({
      error: exception.code,
      message: exception.message,
      statusCode: exception.httpStatus,
    });
  }
}

@Injectable()
class TestTransactionalInterceptor implements NestInterceptor {
  constructor(private readonly em: EntityManager) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest<{ method: string }>();

      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next.handle();
      }
    }

    return from(
      this.em.transactional(() => lastValueFrom(next.handle(), { defaultValue: undefined })),
    );
  }
}

describe('Catalog Interfaces e2e', () => {
  let app: NestFastifyApplication;
  let container: StartedTestContainer;
  let pgClient: Client;
  let ownerToken: string;
  let managerToken: string;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_catalog',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_USER: 'test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('ready to accept connections', 2))
      .start();

    const port = container.getMappedPort(5432);
    const host = container.getHost();
    const databaseUrl = `postgres://test:test@${host}:${String(port)}/test_catalog`;

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
          registerRequestContext: true,
        }),
        IamInfrastructureModule,
        IamInterfacesModule,
        CatalogInfrastructureModule,
        CatalogInterfacesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    app.useGlobalFilters(new TestApplicationExceptionFilter());
    app.useGlobalInterceptors(new TestTransactionalInterceptor(moduleRef.get(EntityManager)));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    await seedUser(pgClient, {
      branchIds: [BRANCH_ID],
      email: 'owner@studio.test',
      fullName: 'Owner',
      id: OWNER_ID,
      password: 'Str0ngP@ss',
      phone: '+79991234567',
      role: 'OWNER',
    });
    await seedUser(pgClient, {
      branchIds: [BRANCH_ID],
      email: 'manager@studio.test',
      fullName: 'Manager',
      id: MANAGER_ID,
      password: 'Str0ngP@ss',
      phone: '+79991234568',
      role: 'MANAGER',
    });

    ownerToken = await loginAndGetToken(app, 'owner@studio.test', 'Str0ngP@ss');
    managerToken = await loginAndGetToken(app, 'manager@studio.test', 'Str0ngP@ss');
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
    await pgClient.end();
    await container.stop();
  });

  afterEach(async () => {
    await pgClient.query(
      `TRUNCATE TABLE "catalog_service_price_history", "catalog_material_norm", "catalog_service_pricing", "catalog_service", "catalog_service_category" CASCADE`,
    );
  });

  describe('ServiceCategories', () => {
    it('OWNER can create, list, update, and deactivate a category', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/service-categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Полировка', icon: 'polish', displayOrder: 1 })
        .expect(201);

      const { id } = createRes.body as { id: string };
      expect(id).toBeDefined();

      const listRes = await request(app.getHttpServer())
        .get('/api/service-categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const categories = listRes.body as { id: string; name: string }[];
      expect(categories).toHaveLength(1);
      expect(categories[0]?.name).toBe('Полировка');

      await request(app.getHttpServer())
        .patch(`/api/service-categories/${id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Керамика' })
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/service-categories/${id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('MANAGER can read categories', async () => {
      await createCategory(app, ownerToken, 'Мойка', 'wash', 1);

      const res = await request(app.getHttpServer())
        .get('/api/service-categories')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const categories = res.body as { name: string }[];
      expect(categories).toHaveLength(1);
      expect(categories[0]?.name).toBe('Мойка');
    });

    it('MANAGER cannot create a category', async () => {
      await request(app.getHttpServer())
        .post('/api/service-categories')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Blocked', icon: 'x', displayOrder: 1 })
        .expect(403);
    });
  });

  describe('Services', () => {
    let categoryId: string;

    beforeEach(async () => {
      categoryId = await createCategory(app, ownerToken, 'Полировка', 'polish', 1);
    });

    it('OWNER can create a service with FIXED pricing', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          categoryId,
          description: 'Базовая полировка кузова',
          displayOrder: 1,
          durationMinutes: 60,
          materialNorms: [],
          name: 'Полировка кузова',
          pricing: {
            fixedPriceCents: '500000',
            type: 'FIXED',
          },
        })
        .expect(201);

      const { id } = createRes.body as { id: string };
      expect(id).toBeDefined();
    });

    it('public catalog endpoint works without auth', async () => {
      await createService(app, ownerToken, categoryId, 'Мойка люкс', 45, {
        fixedPriceCents: '300000',
        type: 'FIXED',
      });

      const res = await request(app.getHttpServer()).get('/api/services/public').expect(200);

      const items = res.body as { name: string }[];
      expect(items).toHaveLength(1);
      expect(items[0]?.name).toBe('Мойка люкс');
    });

    it('MANAGER cannot create a service', async () => {
      await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          categoryId,
          description: 'Blocked',
          displayOrder: 1,
          durationMinutes: 30,
          materialNorms: [],
          name: 'Blocked',
          pricing: { fixedPriceCents: '100000', type: 'FIXED' },
        })
        .expect(403);
    });

    it('OWNER can deactivate a service', async () => {
      const serviceId = await createService(app, ownerToken, categoryId, 'To Deactivate', 30, {
        fixedPriceCents: '100000',
        type: 'FIXED',
      });

      await request(app.getHttpServer())
        .delete(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('validates request body', async () => {
      await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
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

async function createCategory(
  app: NestFastifyApplication,
  token: string,
  name: string,
  icon: string,
  displayOrder: number,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/service-categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ displayOrder, icon, name })
    .expect(201);

  return (res.body as { id: string }).id;
}

async function createService(
  app: NestFastifyApplication,
  token: string,
  categoryId: string,
  name: string,
  durationMinutes: number,
  pricing: { type: string; fixedPriceCents?: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/services')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryId,
      description: `Description for ${name}`,
      displayOrder: 1,
      durationMinutes,
      materialNorms: [],
      name,
      pricing,
    })
    .expect(201);

  return (res.body as { id: string }).id;
}

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

    CREATE TABLE IF NOT EXISTS "iam_refresh_session" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
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

    CREATE TABLE IF NOT EXISTS "catalog_service_category" (
      "id" uuid NOT NULL,
      "name" text NOT NULL,
      "icon" text NOT NULL,
      "display_order" int NOT NULL DEFAULT 0,
      "is_active" boolean NOT NULL DEFAULT true,
      CONSTRAINT "catalog_service_category_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "catalog_service" (
      "id" uuid NOT NULL,
      "category_id" uuid NOT NULL REFERENCES "catalog_service_category"("id"),
      "name" text NOT NULL,
      "description_md" text NOT NULL,
      "duration_minutes" int NOT NULL,
      "pricing_type" text NOT NULL,
      "base_price_cents" bigint NULL,
      "is_active" boolean NOT NULL DEFAULT true,
      "display_order" int NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "version" int NOT NULL DEFAULT 1,
      CONSTRAINT "catalog_service_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "catalog_service_pricing" (
      "service_id" uuid NOT NULL REFERENCES "catalog_service"("id") ON DELETE CASCADE,
      "body_type" text NOT NULL,
      "price_cents" bigint NOT NULL,
      PRIMARY KEY ("service_id", "body_type")
    );

    CREATE TABLE IF NOT EXISTS "catalog_material_norm" (
      "id" uuid NOT NULL,
      "service_id" uuid NOT NULL REFERENCES "catalog_service"("id") ON DELETE CASCADE,
      "sku_id" uuid NOT NULL,
      "amount" numeric NOT NULL,
      "unit" text NOT NULL,
      "body_type_coefficients" jsonb NULL,
      CONSTRAINT "catalog_material_norm_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "catalog_service_price_history" (
      "id" uuid NOT NULL,
      "service_id" uuid NOT NULL REFERENCES "catalog_service"("id") ON DELETE CASCADE,
      "pricing_type" text NOT NULL,
      "base_price_cents" bigint NULL,
      "pricing_snapshot" jsonb NOT NULL,
      "changed_by" uuid NULL,
      "changed_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "catalog_service_price_history_pkey" PRIMARY KEY ("id")
    );
  `);
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
