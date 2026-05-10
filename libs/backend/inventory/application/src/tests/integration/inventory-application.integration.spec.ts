import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';

import { Sku, SkuId, Supplier, SupplierId } from '@det/backend-inventory-domain';
import type {
  ISkuRepository,
  ISupplierRepository,
  ArticleNumber,
  Barcode,
} from '@det/backend-inventory-domain';
import { CLOCK, DateTime, ID_GENERATOR, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { DomainEvent, IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { CreateSkuCommand } from '../../commands/create-sku/create-sku.command';
import { CreateSupplierCommand } from '../../commands/create-supplier/create-supplier.command';
import { DeactivateSkuCommand } from '../../commands/deactivate-sku/deactivate-sku.command';
import { DeactivateSupplierCommand } from '../../commands/deactivate-supplier/deactivate-supplier.command';
import { UpdateSkuCommand } from '../../commands/update-sku/update-sku.command';
import { UpdateSupplierContactCommand } from '../../commands/update-supplier-contact/update-supplier-contact.command';
import {
  ADJUSTMENT_READ_PORT,
  ADJUSTMENT_REPOSITORY,
  BATCH_SELECTOR,
  BATCH_USAGE_PORT,
  IDEMPOTENCY_PORT,
  INVENTORY_CONFIG_PORT,
  MOVEMENT_READ_PORT,
  RECEIPT_READ_PORT,
  RECEIPT_REPOSITORY,
  SKU_READ_PORT,
  SKU_REPOSITORY,
  STOCK_READ_PORT,
  STOCK_REPOSITORY,
  STOCK_SNAPSHOT_PORT,
  STOCK_TAKING_READ_PORT,
  STOCK_TAKING_REPOSITORY,
  SUPPLIER_READ_PORT,
  SUPPLIER_REPOSITORY,
  TRANSFER_READ_PORT,
  TRANSFER_REPOSITORY,
} from '../../di/tokens';
import {
  ArticleNumberAlreadyExistsError,
  BarcodeAlreadyExistsError,
  SkuNotFoundError,
  SupplierNotFoundError,
} from '../../errors/application.errors';
import { InventoryApplicationModule } from '../../inventory-application.module';
import { GetSkuByBarcodeQuery } from '../../queries/get-sku-by-barcode/get-sku-by-barcode.query';
import { GetSkuByIdQuery } from '../../queries/get-sku-by-id/get-sku-by-id.query';
import { GetSupplierByIdQuery } from '../../queries/get-supplier-by-id/get-supplier-by-id.query';
import { ListSkusQuery } from '../../queries/list-skus/list-skus.query';
import { ListSuppliersQuery } from '../../queries/list-suppliers/list-suppliers.query';

import type { PaginatedResult, ISkuReadPort, ListSkusFilter } from '../../ports/sku-read.port';
import type { ISupplierReadPort, ListSuppliersFilter } from '../../ports/supplier-read.port';
import type { SkuDetailReadModel, SkuListItemReadModel } from '../../read-models/sku.read-models';
import type { SupplierListItemReadModel } from '../../read-models/supplier.read-models';
import type { TestingModule } from '@nestjs/testing';
import type { QueryResultRow } from 'pg';
import type { StartedTestContainer } from 'testcontainers';

const SKU_ID_1 = '11111111-1111-4111-8111-111111111111';
const SKU_ID_2 = '22222222-2222-4222-8222-222222222222';
const SUPPLIER_ID_1 = '33333333-3333-4333-8333-333333333333';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');

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

class PostgresSkuRepository implements ISkuRepository {
  constructor(private readonly client: Client) {}

  async findById(id: SkuId): Promise<Sku | null> {
    const result = await this.client.query('select * from inv_skus where id = $1', [id]);
    const row = result.rows[0];

    return row ? this.toDomain(row) : null;
  }

  async findByArticleNumber(articleNumber: ArticleNumber): Promise<Sku | null> {
    const result = await this.client.query('select * from inv_skus where article_number = $1', [
      articleNumber.getValue(),
    ]);
    const row = result.rows[0];

    return row ? this.toDomain(row) : null;
  }

  async findByBarcode(barcode: Barcode): Promise<Sku | null> {
    const result = await this.client.query('select * from inv_skus where barcode = $1', [
      barcode.getValue(),
    ]);
    const row = result.rows[0];

    return row ? this.toDomain(row) : null;
  }

  async save(sku: Sku): Promise<void> {
    const snapshot = sku.toSnapshot();
    const events = sku.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into inv_skus (id, article_number, name, "group", base_unit, packagings, barcode, has_expiry, photo_url, is_active, description)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)
         on conflict (id) do update set
           article_number = excluded.article_number,
           name = excluded.name,
           "group" = excluded."group",
           base_unit = excluded.base_unit,
           packagings = excluded.packagings,
           barcode = excluded.barcode,
           has_expiry = excluded.has_expiry,
           photo_url = excluded.photo_url,
           is_active = excluded.is_active,
           description = excluded.description`,
        [
          snapshot.id,
          snapshot.articleNumber,
          snapshot.name,
          snapshot.group,
          snapshot.baseUnit,
          JSON.stringify(snapshot.packagings),
          snapshot.barcode,
          snapshot.hasExpiry,
          snapshot.photoUrl,
          snapshot.isActive,
          snapshot.description,
        ],
      );
      await insertOutboxEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private toDomain(row: Record<string, unknown>): Sku {
    return Sku.restore({
      articleNumber: row['article_number'] as string,
      barcode: (row['barcode'] as string | null) ?? null,
      baseUnit: row['base_unit'] as UnitOfMeasure,
      description: row['description'] as string,
      group: row['group'] as string,
      hasExpiry: row['has_expiry'] as boolean,
      id: row['id'] as string,
      isActive: row['is_active'] as boolean,
      name: row['name'] as string,
      packagings: row['packagings'] as readonly { id: string; name: string; coefficient: number }[],
      photoUrl: (row['photo_url'] as string | null) ?? null,
    });
  }
}

class PostgresSupplierRepository implements ISupplierRepository {
  constructor(private readonly client: Client) {}

  async findById(id: SupplierId): Promise<Supplier | null> {
    const result = await this.client.query('select * from inv_suppliers where id = $1', [id]);
    const row = result.rows[0];

    return row ? this.toDomain(row) : null;
  }

  async save(supplier: Supplier): Promise<void> {
    const snapshot = supplier.toSnapshot();
    const events = supplier.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into inv_suppliers (id, name, inn, contact_phone, contact_email, contact_address, is_active)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update set
           name = excluded.name,
           inn = excluded.inn,
           contact_phone = excluded.contact_phone,
           contact_email = excluded.contact_email,
           contact_address = excluded.contact_address,
           is_active = excluded.is_active`,
        [
          snapshot.id,
          snapshot.name,
          snapshot.inn,
          snapshot.contact.phone,
          snapshot.contact.email,
          snapshot.contact.address,
          snapshot.isActive,
        ],
      );
      await insertOutboxEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  private toDomain(row: Record<string, unknown>): Supplier {
    return Supplier.restore({
      contact: {
        address: (row['contact_address'] as string | null) ?? null,
        email: (row['contact_email'] as string | null) ?? null,
        phone: (row['contact_phone'] as string | null) ?? null,
      },
      id: row['id'] as string,
      inn: (row['inn'] as string | null) ?? null,
      isActive: row['is_active'] as boolean,
      name: row['name'] as string,
    });
  }
}

class InMemorySkuReadPort implements ISkuReadPort {
  constructor(
    private readonly skuRepo: PostgresSkuRepository,
    private readonly client: Client,
  ) {}

  async list(filter: ListSkusFilter): Promise<PaginatedResult<SkuListItemReadModel>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter.group !== undefined) {
      conditions.push(`"group" = $${String(paramIdx++)}`);
      params.push(filter.group);
    }

    if (filter.isActive !== undefined) {
      conditions.push(`is_active = $${String(paramIdx++)}`);
      params.push(filter.isActive);
    }

    if (filter.search !== undefined && filter.search.length > 0) {
      conditions.push(
        `(article_number ilike $${String(paramIdx)} or name ilike $${String(paramIdx)})`,
      );
      params.push(`%${filter.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

    const countResult = await this.client.query<{ count: string }>(
      `select count(*)::text as count from inv_skus ${where}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

    const dataResult = await this.client.query(
      `select id, article_number, name, "group", base_unit, is_active, barcode from inv_skus ${where} order by article_number asc limit $${String(paramIdx++)} offset $${String(paramIdx++)}`,
      [...params, filter.limit, filter.offset],
    );

    const items: SkuListItemReadModel[] = dataResult.rows.map((row: Record<string, unknown>) => ({
      articleNumber: row['article_number'] as string,
      barcode: (row['barcode'] as string | null) ?? null,
      baseUnit: row['base_unit'] as UnitOfMeasure,
      group: row['group'] as string,
      id: row['id'] as string,
      isActive: row['is_active'] as boolean,
      name: row['name'] as string,
    }));

    return { items, total };
  }
}

class InMemorySupplierReadPort implements ISupplierReadPort {
  constructor(private readonly client: Client) {}

  async list(filter: ListSuppliersFilter): Promise<PaginatedResult<SupplierListItemReadModel>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter.isActive !== undefined) {
      conditions.push(`is_active = $${String(paramIdx++)}`);
      params.push(filter.isActive);
    }

    if (filter.search !== undefined && filter.search.length > 0) {
      conditions.push(`name ilike $${String(paramIdx)}`);
      params.push(`%${filter.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

    const countResult = await this.client.query<{ count: string }>(
      `select count(*)::text as count from inv_suppliers ${where}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

    const dataResult = await this.client.query(
      `select id, name, inn, is_active from inv_suppliers ${where} order by name asc limit $${String(paramIdx++)} offset $${String(paramIdx++)}`,
      [...params, filter.limit, filter.offset],
    );

    const items: SupplierListItemReadModel[] = dataResult.rows.map(
      (row: Record<string, unknown>) => ({
        id: row['id'] as string,
        inn: (row['inn'] as string | null) ?? null,
        isActive: row['is_active'] as boolean,
        name: row['name'] as string,
      }),
    );

    return { items, total };
  }
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
    create table if not exists inv_skus (
      id uuid primary key,
      article_number text not null unique,
      name text not null,
      "group" text not null,
      base_unit text not null,
      packagings jsonb not null default '[]',
      barcode text unique,
      has_expiry boolean not null default false,
      photo_url text,
      is_active boolean not null default true,
      description text not null default ''
    );

    create table if not exists inv_suppliers (
      id uuid primary key,
      name text not null,
      inn text,
      contact_phone text,
      contact_email text,
      contact_address text,
      is_active boolean not null default true
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
  await client.query('truncate table outbox_events, inv_suppliers, inv_skus');
}

async function outboxEvents(client: Client): Promise<readonly OutboxRow[]> {
  const result = await client.query<OutboxRow>(
    'select event_type, payload from outbox_events order by occurred_at, id',
  );

  return result.rows;
}

describe('InventoryApplicationModule integration', () => {
  let container: StartedTestContainer;
  let client: Client;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let moduleRef: TestingModule;
  let skuRepo: PostgresSkuRepository;
  let supplierRepo: PostgresSupplierRepository;
  let idGen: QueueIdGenerator;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_DB: 'inv_application',
        POSTGRES_PASSWORD: 'inv',
        POSTGRES_USER: 'inv',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    client = new Client({
      database: 'inv_application',
      host: container.getHost(),
      password: 'inv',
      port: container.getMappedPort(5432),
      user: 'inv',
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
    skuRepo = new PostgresSkuRepository(client);
    supplierRepo = new PostgresSupplierRepository(client);
    const skuReadPort = new InMemorySkuReadPort(skuRepo, client);
    const supplierReadPort = new InMemorySupplierReadPort(client);

    moduleRef = await Test.createTestingModule({
      imports: [
        InventoryApplicationModule.register([
          { provide: SKU_REPOSITORY, useValue: skuRepo },
          { provide: SUPPLIER_REPOSITORY, useValue: supplierRepo },
          { provide: RECEIPT_REPOSITORY, useValue: {} },
          { provide: ADJUSTMENT_REPOSITORY, useValue: {} },
          { provide: STOCK_REPOSITORY, useValue: {} },
          { provide: TRANSFER_REPOSITORY, useValue: {} },
          { provide: STOCK_TAKING_REPOSITORY, useValue: {} },
          { provide: BATCH_USAGE_PORT, useValue: {} },
          { provide: BATCH_SELECTOR, useValue: {} },
          { provide: INVENTORY_CONFIG_PORT, useValue: {} },
          { provide: IDEMPOTENCY_PORT, useValue: {} },
          { provide: STOCK_SNAPSHOT_PORT, useValue: {} },
          { provide: RECEIPT_READ_PORT, useValue: {} },
          { provide: ADJUSTMENT_READ_PORT, useValue: {} },
          { provide: TRANSFER_READ_PORT, useValue: {} },
          { provide: STOCK_TAKING_READ_PORT, useValue: {} },
          { provide: STOCK_READ_PORT, useValue: {} },
          { provide: MOVEMENT_READ_PORT, useValue: {} },
          { provide: SKU_READ_PORT, useValue: skuReadPort },
          { provide: SUPPLIER_READ_PORT, useValue: supplierReadPort },
          { provide: CLOCK, useValue: new FixedClock(NOW) },
          { provide: ID_GENERATOR, useValue: idGen },
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

  describe('CreateSkuCommand', () => {
    it('creates sku and writes SkuCreated to outbox', async () => {
      idGen.reset([SKU_ID_1]);

      const result = await commandBus.execute<CreateSkuCommand, { id: SkuId }>(
        new CreateSkuCommand(
          'ART-001',
          'Полироль',
          'Полировка',
          UnitOfMeasure.ML,
          false,
          [{ id: 'pkg-1', name: 'Бутылка 500мл', coefficient: 500 }],
          '4600000000008',
          null,
          'Описание',
        ),
      );

      expect(result.id).toBe(SKU_ID_1);

      const detail = await queryBus.execute<GetSkuByIdQuery, SkuDetailReadModel>(
        new GetSkuByIdQuery(SkuId.from(SKU_ID_1)),
      );
      expect(detail).toMatchObject({
        articleNumber: 'ART-001',
        barcode: '4600000000008',
        baseUnit: UnitOfMeasure.ML,
        description: 'Описание',
        group: 'Полировка',
        hasExpiry: false,
        id: SKU_ID_1,
        isActive: true,
        name: 'Полироль',
      });
      expect(detail.packagings).toHaveLength(1);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'SkuCreated' }]);
    });

    it('rejects duplicate articleNumber', async () => {
      idGen.reset([SKU_ID_1, SKU_ID_2]);

      await commandBus.execute(
        new CreateSkuCommand(
          'ART-001',
          'SKU 1',
          'Группа',
          UnitOfMeasure.ML,
          false,
          [],
          null,
          null,
          '',
        ),
      );

      await expect(
        commandBus.execute(
          new CreateSkuCommand(
            'ART-001',
            'SKU 2',
            'Группа',
            UnitOfMeasure.ML,
            false,
            [],
            null,
            null,
            '',
          ),
        ),
      ).rejects.toBeInstanceOf(ArticleNumberAlreadyExistsError);
    });

    it('rejects duplicate barcode', async () => {
      idGen.reset([SKU_ID_1, SKU_ID_2]);

      await commandBus.execute(
        new CreateSkuCommand(
          'ART-001',
          'SKU 1',
          'Группа',
          UnitOfMeasure.ML,
          false,
          [],
          '4600000000008',
          null,
          '',
        ),
      );

      await expect(
        commandBus.execute(
          new CreateSkuCommand(
            'ART-002',
            'SKU 2',
            'Группа',
            UnitOfMeasure.ML,
            false,
            [],
            '4600000000008',
            null,
            '',
          ),
        ),
      ).rejects.toBeInstanceOf(BarcodeAlreadyExistsError);
    });
  });

  describe('UpdateSkuCommand', () => {
    it('renames sku and changes group', async () => {
      idGen.reset([SKU_ID_1]);
      await commandBus.execute(
        new CreateSkuCommand(
          'ART-001',
          'Old Name',
          'Old Group',
          UnitOfMeasure.ML,
          false,
          [],
          null,
          null,
          '',
        ),
      );
      await client.query('truncate table outbox_events');

      await commandBus.execute(new UpdateSkuCommand(SkuId.from(SKU_ID_1), 'New Name', 'New Group'));

      const detail = await queryBus.execute<GetSkuByIdQuery, SkuDetailReadModel>(
        new GetSkuByIdQuery(SkuId.from(SKU_ID_1)),
      );
      expect(detail.name).toBe('New Name');
      expect(detail.group).toBe('New Group');

      const events = await outboxEvents(client);
      const eventTypes = events.map((e) => e.event_type);
      expect(eventTypes).toContain('SkuRenamed');
      expect(eventTypes).toContain('SkuGroupChanged');
    });

    it('throws SkuNotFoundError for unknown id', async () => {
      await expect(
        commandBus.execute(new UpdateSkuCommand(SkuId.from(SKU_ID_1), 'Name')),
      ).rejects.toBeInstanceOf(SkuNotFoundError);
    });
  });

  describe('DeactivateSkuCommand', () => {
    it('deactivates sku', async () => {
      idGen.reset([SKU_ID_1]);
      await commandBus.execute(
        new CreateSkuCommand(
          'ART-001',
          'SKU',
          'Group',
          UnitOfMeasure.ML,
          false,
          [],
          null,
          null,
          '',
        ),
      );
      await client.query('truncate table outbox_events');

      await commandBus.execute(new DeactivateSkuCommand(SkuId.from(SKU_ID_1)));

      const detail = await queryBus.execute<GetSkuByIdQuery, SkuDetailReadModel>(
        new GetSkuByIdQuery(SkuId.from(SKU_ID_1)),
      );
      expect(detail.isActive).toBe(false);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'SkuDeactivated' }]);
    });

    it('throws SkuNotFoundError for unknown id', async () => {
      await expect(
        commandBus.execute(new DeactivateSkuCommand(SkuId.from(SKU_ID_1))),
      ).rejects.toBeInstanceOf(SkuNotFoundError);
    });
  });

  describe('GetSkuByBarcodeQuery', () => {
    it('finds sku by barcode', async () => {
      idGen.reset([SKU_ID_1]);
      await commandBus.execute(
        new CreateSkuCommand(
          'ART-001',
          'SKU',
          'Group',
          UnitOfMeasure.ML,
          false,
          [],
          '4600000000008',
          null,
          '',
        ),
      );

      const detail = await queryBus.execute<GetSkuByBarcodeQuery, SkuDetailReadModel>(
        new GetSkuByBarcodeQuery('4600000000008'),
      );

      expect(detail.id).toBe(SKU_ID_1);
    });

    it('throws SkuNotFoundError for unknown barcode', async () => {
      await expect(
        queryBus.execute(new GetSkuByBarcodeQuery('0000000000000')),
      ).rejects.toBeInstanceOf(SkuNotFoundError);
    });
  });

  describe('ListSkusQuery', () => {
    it('returns paginated list with filters', async () => {
      idGen.reset([SKU_ID_1, SKU_ID_2]);
      await commandBus.execute(
        new CreateSkuCommand(
          'ART-001',
          'Полироль',
          'Полировка',
          UnitOfMeasure.ML,
          false,
          [],
          null,
          null,
          '',
        ),
      );
      await commandBus.execute(
        new CreateSkuCommand(
          'ART-002',
          'Шампунь',
          'Мойка',
          UnitOfMeasure.ML,
          false,
          [],
          null,
          null,
          '',
        ),
      );

      const result = await queryBus.execute<ListSkusQuery, PaginatedResult<SkuListItemReadModel>>(
        new ListSkusQuery(0, 10, 'Полировка'),
      );

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('Полироль');
    });

    it('searches by articleNumber or name', async () => {
      idGen.reset([SKU_ID_1, SKU_ID_2]);
      await commandBus.execute(
        new CreateSkuCommand(
          'ART-001',
          'Полироль',
          'Группа',
          UnitOfMeasure.ML,
          false,
          [],
          null,
          null,
          '',
        ),
      );
      await commandBus.execute(
        new CreateSkuCommand(
          'ART-002',
          'Шампунь',
          'Группа',
          UnitOfMeasure.ML,
          false,
          [],
          null,
          null,
          '',
        ),
      );

      const result = await queryBus.execute<ListSkusQuery, PaginatedResult<SkuListItemReadModel>>(
        new ListSkusQuery(0, 10, undefined, undefined, 'Шамп'),
      );

      expect(result.total).toBe(1);
      expect(result.items[0]?.articleNumber).toBe('ART-002');
    });
  });

  describe('CreateSupplierCommand', () => {
    it('creates supplier and writes SupplierCreated to outbox', async () => {
      idGen.reset([SUPPLIER_ID_1]);

      const result = await commandBus.execute<CreateSupplierCommand, { id: SupplierId }>(
        new CreateSupplierCommand('ООО Поставщик', '7707083893', {
          address: 'г. Москва, ул. Примерная, 1',
          email: 'info@supplier.ru',
          phone: '+79991234567',
        }),
      );

      expect(result.id).toBe(SUPPLIER_ID_1);

      const detail = await queryBus.execute(
        new GetSupplierByIdQuery(SupplierId.from(SUPPLIER_ID_1)),
      );
      expect(detail).toMatchObject({
        contact: { email: 'info@supplier.ru', phone: '+79991234567' },
        id: SUPPLIER_ID_1,
        inn: '7707083893',
        isActive: true,
        name: 'ООО Поставщик',
      });

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'SupplierCreated' }]);
    });
  });

  describe('UpdateSupplierContactCommand', () => {
    it('updates supplier contact', async () => {
      idGen.reset([SUPPLIER_ID_1]);
      await commandBus.execute(
        new CreateSupplierCommand('ООО Поставщик', null, {
          address: null,
          email: null,
          phone: '+79991234567',
        }),
      );
      await client.query('truncate table outbox_events');

      await commandBus.execute(
        new UpdateSupplierContactCommand(SupplierId.from(SUPPLIER_ID_1), {
          address: 'Новый адрес',
          email: 'new@email.com',
          phone: '+79997654321',
        }),
      );

      const detail = await queryBus.execute(
        new GetSupplierByIdQuery(SupplierId.from(SUPPLIER_ID_1)),
      );
      expect(detail.contact).toEqual({
        address: 'Новый адрес',
        email: 'new@email.com',
        phone: '+79997654321',
      });

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'SupplierContactUpdated' }]);
    });

    it('throws SupplierNotFoundError for unknown id', async () => {
      await expect(
        commandBus.execute(
          new UpdateSupplierContactCommand(SupplierId.from(SUPPLIER_ID_1), {
            address: null,
            email: null,
            phone: null,
          }),
        ),
      ).rejects.toBeInstanceOf(SupplierNotFoundError);
    });
  });

  describe('DeactivateSupplierCommand', () => {
    it('deactivates supplier', async () => {
      idGen.reset([SUPPLIER_ID_1]);
      await commandBus.execute(
        new CreateSupplierCommand('ООО Поставщик', null, {
          address: null,
          email: null,
          phone: null,
        }),
      );
      await client.query('truncate table outbox_events');

      await commandBus.execute(new DeactivateSupplierCommand(SupplierId.from(SUPPLIER_ID_1)));

      const detail = await queryBus.execute(
        new GetSupplierByIdQuery(SupplierId.from(SUPPLIER_ID_1)),
      );
      expect(detail.isActive).toBe(false);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'SupplierDeactivated' }]);
    });

    it('throws SupplierNotFoundError for unknown id', async () => {
      await expect(
        commandBus.execute(new DeactivateSupplierCommand(SupplierId.from(SUPPLIER_ID_1))),
      ).rejects.toBeInstanceOf(SupplierNotFoundError);
    });
  });

  describe('ListSuppliersQuery', () => {
    it('returns paginated list', async () => {
      idGen.reset([SUPPLIER_ID_1, '44444444-4444-4444-8444-444444444444']);
      await commandBus.execute(
        new CreateSupplierCommand('ООО Альфа', null, { address: null, email: null, phone: null }),
      );
      await commandBus.execute(
        new CreateSupplierCommand('ООО Бета', null, { address: null, email: null, phone: null }),
      );

      const result = await queryBus.execute<
        ListSuppliersQuery,
        PaginatedResult<SupplierListItemReadModel>
      >(new ListSuppliersQuery(0, 10));

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('filters by search', async () => {
      idGen.reset([SUPPLIER_ID_1, '44444444-4444-4444-8444-444444444444']);
      await commandBus.execute(
        new CreateSupplierCommand('ООО Альфа', null, { address: null, email: null, phone: null }),
      );
      await commandBus.execute(
        new CreateSupplierCommand('ООО Бета', null, { address: null, email: null, phone: null }),
      );

      const result = await queryBus.execute<
        ListSuppliersQuery,
        PaginatedResult<SupplierListItemReadModel>
      >(new ListSuppliersQuery(0, 10, undefined, 'Альфа'));

      expect(result.total).toBe(1);
      expect(result.items[0]?.name).toBe('ООО Альфа');
    });
  });
});
