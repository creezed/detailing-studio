import { CommandBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';

import {
  Adjustment,
  AdjustmentId,
  AdjustmentLine,
  AdjustmentStatus,
  Receipt,
  ReceiptId,
  ReceiptLine,
  ReceiptStatus,
  SignedQuantity,
  Stock,
} from '@det/backend-inventory-domain';
import type {
  IAdjustmentRepository,
  IBatchSelector,
  IReceiptRepository,
  IStockRepository,
} from '@det/backend-inventory-domain';
import { DateTime, Money, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { DomainEvent, IClock, IIdGenerator } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, SupplierId, UserId } from '@det/shared-types';

import { ApproveAdjustmentCommand } from '../../commands/approve-adjustment/approve-adjustment.command';
import { CancelReceiptCommand } from '../../commands/cancel-receipt/cancel-receipt.command';
import { CreateAdjustmentCommand } from '../../commands/create-adjustment/create-adjustment.command';
import { CreateReceiptCommand } from '../../commands/create-receipt/create-receipt.command';
import { PostReceiptCommand } from '../../commands/post-receipt/post-receipt.command';
import { RejectAdjustmentCommand } from '../../commands/reject-adjustment/reject-adjustment.command';
import { UpdateReceiptCommand } from '../../commands/update-receipt/update-receipt.command';
import {
  ADJUSTMENT_READ_PORT,
  ADJUSTMENT_REPOSITORY,
  BATCH_SELECTOR,
  BATCH_USAGE_PORT,
  CLOCK,
  ID_GENERATOR,
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
  AdjustmentNotFoundError,
  ReceiptBatchesAlreadyConsumedError,
  ReceiptNotFoundError,
} from '../../errors/application.errors';
import { InventoryApplicationModule } from '../../inventory-application.module';

import type { IBatchUsagePort } from '../../ports/batch-usage.port';
import type { IIdempotencyPort } from '../../ports/idempotency.port';
import type { IInventoryConfigPort } from '../../ports/inventory-config.port';
import type { TestingModule } from '@nestjs/testing';
import type { StartedTestContainer } from 'testcontainers';

const RECEIPT_ID_1 = '11111111-1111-4111-8111-111111111111';
const ADJUSTMENT_ID_1 = '22222222-2222-4222-8222-222222222222';
const SUPPLIER_ID = '33333333-3333-4333-8333-333333333333' as unknown as SupplierId;
const BRANCH_ID = '44444444-4444-4444-8444-444444444444' as unknown as BranchId;
const USER_ID = '55555555-5555-4555-8555-555555555555' as unknown as UserId;
const SKU_ID_A = '66666666-6666-4666-8666-666666666666' as unknown as SkuId;
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');

class FixedClock implements IClock {
  now(): DateTime {
    return NOW;
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
      return crypto.randomUUID();
    }

    return id;
  }
}

class InMemoryReceiptRepository implements IReceiptRepository {
  constructor(private readonly client: Client) {}

  async findById(id: ReceiptId): Promise<Receipt | null> {
    const r = await this.client.query('select * from inv_receipts where id = $1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;

    if (!row) return null;

    const linesRes = await this.client.query(
      'select * from inv_receipt_lines where receipt_id = $1',
      [id],
    );

    const lines = (linesRes.rows as Record<string, unknown>[]).map((l) =>
      ReceiptLine.create({
        baseQuantity: Quantity.of(Number(l['base_quantity']), l['base_unit'] as UnitOfMeasure),
        expiresAt: l['expires_at'] ? DateTime.from(l['expires_at'] as string) : null,
        id: l['id'] as string,
        packagingId: (l['packaging_id'] as string | null) ?? null,
        packageQuantity: Number(l['package_quantity']),
        skuId: l['sku_id'] as SkuId,
        unitCost: Money.rub(l['unit_cost_rub'] as string),
      }),
    );

    return Receipt.restore(
      ReceiptId.from(row['id'] as string),
      row['supplier_id'] as SupplierId,
      row['branch_id'] as BranchId,
      row['status'] as ReceiptStatus,
      lines,
      (row['invoice_number'] as string | null) ?? null,
      row['invoice_date'] ? DateTime.from(row['invoice_date'] as string) : null,
      (row['attachment_url'] as string | null) ?? null,
      row['created_by'] as UserId,
      row['posted_by'] ? (row['posted_by'] as unknown as UserId) : null,
      DateTime.from(row['created_at'] as string),
      row['posted_at'] ? DateTime.from(row['posted_at'] as string) : null,
    );
  }

  async save(receipt: Receipt): Promise<void> {
    const events = receipt.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into inv_receipts (id, supplier_id, branch_id, status, invoice_number, invoice_date, attachment_url, created_by, posted_by, created_at, posted_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (id) do update set
           status=excluded.status, posted_by=excluded.posted_by, posted_at=excluded.posted_at, attachment_url=excluded.attachment_url`,
        [
          receipt.id,
          receipt.supplierId,
          receipt.branchId,
          receipt.status,
          null,
          null,
          null,
          USER_ID,
          receipt.status === ReceiptStatus.POSTED ? USER_ID : null,
          NOW.toDate(),
          receipt.status === ReceiptStatus.POSTED ? NOW.toDate() : null,
        ],
      );

      await this.client.query('delete from inv_receipt_lines where receipt_id = $1', [receipt.id]);

      for (const line of receipt.lines) {
        await this.client.query(
          `insert into inv_receipt_lines (id, receipt_id, sku_id, packaging_id, package_quantity, base_quantity, base_unit, unit_cost_rub, expires_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            line.id,
            receipt.id,
            line.skuId,
            line.packagingId,
            line.packageQuantity,
            line.baseQuantity.amount,
            line.baseQuantity.unit,
            `${String(Math.floor(Number(line.unitCost.cents) / 100))}.${String(Number(line.unitCost.cents) % 100).padStart(2, '0')}`,
            line.expiresAt?.toDate() ?? null,
          ],
        );
      }

      await insertOutboxEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }
}

class InMemoryAdjustmentRepository implements IAdjustmentRepository {
  constructor(private readonly client: Client) {}

  async findById(id: AdjustmentId): Promise<Adjustment | null> {
    const r = await this.client.query('select * from inv_adjustments where id = $1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;

    if (!row) return null;

    const linesRes = await this.client.query(
      'select * from inv_adjustment_lines where adjustment_id = $1',
      [id],
    );

    const lines = (linesRes.rows as Record<string, unknown>[]).map((l) =>
      AdjustmentLine.create(
        l['sku_id'] as SkuId,
        SignedQuantity.of(Number(l['delta_amount']), l['delta_unit'] as UnitOfMeasure),
        Money.rub(l['snapshot_unit_cost_rub'] as string),
      ),
    );

    return Adjustment.restore(
      AdjustmentId.from(row['id'] as string),
      row['branch_id'] as BranchId,
      row['status'] as AdjustmentStatus,
      row['reason'] as string,
      lines,
      BigInt(row['total_amount_cents'] as string),
      row['created_by'] as UserId,
      row['approved_by'] ? (row['approved_by'] as unknown as UserId) : null,
      DateTime.from(row['created_at'] as string),
      row['approved_at'] ? DateTime.from(row['approved_at'] as string) : null,
    );
  }

  async save(adjustment: Adjustment): Promise<void> {
    const events = adjustment.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into inv_adjustments (id, branch_id, status, reason, total_amount_cents, created_by, approved_by, created_at, approved_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (id) do update set
           status=excluded.status, approved_by=excluded.approved_by, approved_at=excluded.approved_at`,
        [
          adjustment.id,
          BRANCH_ID,
          adjustment.status,
          'test',
          adjustment.totalAmountCents.toString(),
          USER_ID,
          adjustment.status === AdjustmentStatus.APPROVED ? USER_ID : null,
          NOW.toDate(),
          adjustment.status === AdjustmentStatus.APPROVED ? NOW.toDate() : null,
        ],
      );

      await this.client.query('delete from inv_adjustment_lines where adjustment_id = $1', [
        adjustment.id,
      ]);

      for (const line of adjustment.lines) {
        await this.client.query(
          `insert into inv_adjustment_lines (adjustment_id, sku_id, delta_amount, delta_unit, snapshot_unit_cost_rub)
           values ($1,$2,$3,$4,$5)`,
          [
            adjustment.id,
            line.skuId,
            line.delta.amount,
            line.delta.unit,
            `${String(Math.floor(Number(line.snapshotUnitCost.cents) / 100))}.${String(Number(line.snapshotUnitCost.cents) % 100).padStart(2, '0')}`,
          ],
        );
      }

      await insertOutboxEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  findPendingApprovals(): Promise<readonly Adjustment[]> {
    return Promise.resolve([]);
  }
}

class InMemoryStockRepository implements IStockRepository {
  constructor(private readonly client: Client) {}

  async findByCompositeId(skuId: SkuId, branchId: BranchId): Promise<Stock | null> {
    const r = await this.client.query(
      'select * from inv_stocks where sku_id = $1 and branch_id = $2',
      [skuId, branchId],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;

    if (!row) return null;

    return Stock.restore({
      averageCostCents: row['average_cost_cents'] as string,
      baseUnit: row['base_unit'] as UnitOfMeasure,
      batches: [],
      branchId: row['branch_id'] as string,
      reorderLevel: row['reorder_level'] as number,
      skuId: row['sku_id'] as string,
    });
  }

  async findOrCreate(
    skuId: SkuId,
    branchId: BranchId,
    baseUnit: UnitOfMeasure,
    reorderLevel: Quantity,
  ): Promise<Stock> {
    const existing = await this.findByCompositeId(skuId, branchId);

    if (existing) return existing;

    return Stock.createEmpty(skuId, branchId, baseUnit, reorderLevel, NOW);
  }

  async save(stock: Stock): Promise<void> {
    const snapshot = stock.toSnapshot();
    const events = stock.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into inv_stocks (sku_id, branch_id, base_unit, reorder_level, average_cost_cents)
         values ($1,$2,$3,$4,$5)
         on conflict (sku_id, branch_id) do update set
           reorder_level=excluded.reorder_level, average_cost_cents=excluded.average_cost_cents`,
        [
          snapshot.skuId,
          snapshot.branchId,
          snapshot.baseUnit,
          snapshot.reorderLevel,
          snapshot.averageCostCents,
        ],
      );
      await insertOutboxEvents(this.client, events);
      await this.client.query('commit');
    } catch (error) {
      await this.client.query('rollback');
      throw error;
    }
  }

  findLowStock(): Promise<readonly Stock[]> {
    return Promise.resolve([]);
  }
}

class InMemoryBatchUsagePort implements IBatchUsagePort {
  private readonly consumed = new Set<string>();

  markConsumed(receiptId: string): void {
    this.consumed.add(receiptId);
  }

  areBatchesUntouched(receiptId: ReceiptId): Promise<boolean> {
    return Promise.resolve(!this.consumed.has(receiptId as string));
  }
}

class InMemoryIdempotencyPort implements IIdempotencyPort {
  private readonly processed = new Set<string>();

  hasProcessed(key: string): Promise<boolean> {
    return Promise.resolve(this.processed.has(key));
  }

  markProcessed(key: string): Promise<void> {
    this.processed.add(key);

    return Promise.resolve();
  }
}

class InMemoryConfigPort implements IInventoryConfigPort {
  private threshold = Money.rub('100.00');

  setThreshold(money: Money): void {
    this.threshold = money;
  }

  adjustmentAutoApprovalThreshold(): Money {
    return this.threshold;
  }
}

const noopBatchSelector: IBatchSelector = {
  selectForConsumption: () => [],
};

async function insertOutboxEvents(client: Client, events: readonly DomainEvent[]): Promise<void> {
  for (const event of events) {
    await client.query(
      `insert into outbox_events (id, aggregate_id, aggregate_type, event_type, payload, occurred_at)
       values ($1,$2,$3,$4,$5::jsonb,$6)`,
      [
        event.eventId,
        event.aggregateId,
        event.aggregateType,
        event.eventType,
        JSON.stringify(event, (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
        event.occurredAt,
      ],
    );
  }
}

async function createSchema(client: Client): Promise<void> {
  await client.query(`
    create table if not exists inv_receipts (
      id uuid primary key,
      supplier_id uuid not null,
      branch_id uuid not null,
      status text not null,
      invoice_number text,
      invoice_date timestamptz,
      attachment_url text,
      created_by uuid not null,
      posted_by uuid,
      created_at timestamptz not null,
      posted_at timestamptz
    );

    create table if not exists inv_receipt_lines (
      id text not null,
      receipt_id uuid not null references inv_receipts(id),
      sku_id uuid not null,
      packaging_id text,
      package_quantity int not null default 1,
      base_quantity numeric not null,
      base_unit text not null,
      unit_cost_rub text not null,
      expires_at timestamptz
    );

    create table if not exists inv_adjustments (
      id uuid primary key,
      branch_id uuid not null,
      status text not null,
      reason text not null,
      total_amount_cents text not null,
      created_by uuid not null,
      approved_by uuid,
      created_at timestamptz not null,
      approved_at timestamptz
    );

    create table if not exists inv_adjustment_lines (
      adjustment_id uuid not null references inv_adjustments(id),
      sku_id uuid not null,
      delta_amount numeric not null,
      delta_unit text not null,
      snapshot_unit_cost_rub text not null
    );

    create table if not exists inv_stocks (
      sku_id uuid not null,
      branch_id uuid not null,
      base_unit text not null,
      reorder_level numeric not null default 0,
      average_cost_cents text not null default '0',
      primary key (sku_id, branch_id)
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

async function truncateAll(client: Client): Promise<void> {
  await client.query(
    'truncate table outbox_events, inv_adjustment_lines, inv_adjustments, inv_receipt_lines, inv_receipts, inv_stocks',
  );
}

async function outboxEvents(client: Client): Promise<readonly { event_type: string }[]> {
  const result = await client.query<{ event_type: string }>(
    'select event_type from outbox_events order by occurred_at, id',
  );

  return result.rows;
}

describe('Receipt & Adjustment integration', () => {
  let container: StartedTestContainer;
  let client: Client;
  let commandBus: CommandBus;
  let moduleRef: TestingModule;
  let idGen: QueueIdGenerator;
  let batchUsagePort: InMemoryBatchUsagePort;
  let configPort: InMemoryConfigPort;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_DB: 'inv_ra', POSTGRES_PASSWORD: 'inv', POSTGRES_USER: 'inv' })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    client = new Client({
      database: 'inv_ra',
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
    await truncateAll(client);

    idGen = new QueueIdGenerator();
    batchUsagePort = new InMemoryBatchUsagePort();
    configPort = new InMemoryConfigPort();

    const receiptRepo = new InMemoryReceiptRepository(client);
    const adjustmentRepo = new InMemoryAdjustmentRepository(client);
    const stockRepo = new InMemoryStockRepository(client);
    const idempotency = new InMemoryIdempotencyPort();

    moduleRef = await Test.createTestingModule({
      imports: [
        InventoryApplicationModule.register([
          { provide: RECEIPT_REPOSITORY, useValue: receiptRepo },
          { provide: ADJUSTMENT_REPOSITORY, useValue: adjustmentRepo },
          { provide: STOCK_REPOSITORY, useValue: stockRepo },
          { provide: BATCH_USAGE_PORT, useValue: batchUsagePort },
          { provide: BATCH_SELECTOR, useValue: noopBatchSelector },
          { provide: INVENTORY_CONFIG_PORT, useValue: configPort },
          { provide: IDEMPOTENCY_PORT, useValue: idempotency },
          { provide: TRANSFER_REPOSITORY, useValue: {} },
          { provide: STOCK_TAKING_REPOSITORY, useValue: {} },
          { provide: STOCK_SNAPSHOT_PORT, useValue: {} },
          { provide: SKU_REPOSITORY, useValue: {} },
          { provide: SUPPLIER_REPOSITORY, useValue: {} },
          { provide: SKU_READ_PORT, useValue: {} },
          { provide: SUPPLIER_READ_PORT, useValue: {} },
          { provide: RECEIPT_READ_PORT, useValue: {} },
          { provide: ADJUSTMENT_READ_PORT, useValue: {} },
          { provide: TRANSFER_READ_PORT, useValue: {} },
          { provide: STOCK_TAKING_READ_PORT, useValue: {} },
          { provide: STOCK_READ_PORT, useValue: {} },
          { provide: MOVEMENT_READ_PORT, useValue: {} },
          { provide: CLOCK, useValue: new FixedClock() },
          { provide: ID_GENERATOR, useValue: idGen },
        ]),
      ],
    }).compile();
    await moduleRef.init();

    commandBus = moduleRef.get(CommandBus);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('CreateReceiptCommand', () => {
    it('creates a DRAFT receipt with ReceiptCreated outbox event', async () => {
      idGen.reset([RECEIPT_ID_1]);

      const result = await commandBus.execute<CreateReceiptCommand, { id: ReceiptId }>(
        new CreateReceiptCommand(SUPPLIER_ID, BRANCH_ID, USER_ID, 'INV-001', '2026-01-01'),
      );

      expect(result.id).toBe(RECEIPT_ID_1);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'ReceiptCreated' }]);
    });
  });

  describe('UpdateReceiptCommand', () => {
    it('adds lines to a DRAFT receipt', async () => {
      idGen.reset([RECEIPT_ID_1]);
      await commandBus.execute(
        new CreateReceiptCommand(SUPPLIER_ID, BRANCH_ID, USER_ID, null, null),
      );

      await commandBus.execute(
        new UpdateReceiptCommand(ReceiptId.from(RECEIPT_ID_1), [
          {
            id: 'line-1',
            skuId: SKU_ID_A,
            packagingId: null,
            packageQuantity: 1,
            baseQuantity: Quantity.of(500, UnitOfMeasure.ML),
            unitCost: Money.rub('10.00'),
            expiresAt: null,
          },
        ]),
      );

      const r = await client.query(
        'select count(*)::int as cnt from inv_receipt_lines where receipt_id = $1',
        [RECEIPT_ID_1],
      );
      expect((r.rows[0] as Record<string, unknown>)['cnt']).toBe(1);
    });

    it('throws ReceiptNotFoundError for unknown id', async () => {
      await expect(
        commandBus.execute(new UpdateReceiptCommand(ReceiptId.from(RECEIPT_ID_1), [])),
      ).rejects.toBeInstanceOf(ReceiptNotFoundError);
    });
  });

  describe('PostReceiptCommand', () => {
    it('posts receipt and writes ReceiptPosted to outbox', async () => {
      idGen.reset([RECEIPT_ID_1]);
      await commandBus.execute(
        new CreateReceiptCommand(SUPPLIER_ID, BRANCH_ID, USER_ID, null, null),
      );
      await commandBus.execute(
        new UpdateReceiptCommand(ReceiptId.from(RECEIPT_ID_1), [
          {
            id: 'line-1',
            skuId: SKU_ID_A,
            packagingId: null,
            packageQuantity: 1,
            baseQuantity: Quantity.of(1000, UnitOfMeasure.ML),
            unitCost: Money.rub('50.00'),
            expiresAt: null,
          },
        ]),
      );
      await client.query('truncate table outbox_events');

      await commandBus.execute(new PostReceiptCommand(ReceiptId.from(RECEIPT_ID_1), USER_ID));

      const r = await client.query('select status from inv_receipts where id = $1', [RECEIPT_ID_1]);
      expect((r.rows[0] as Record<string, unknown>)['status']).toBe(ReceiptStatus.POSTED);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'ReceiptPosted' }]);
    });

    it('rejects double post (ReceiptAlreadyPostedError)', async () => {
      idGen.reset([RECEIPT_ID_1]);
      await commandBus.execute(
        new CreateReceiptCommand(SUPPLIER_ID, BRANCH_ID, USER_ID, null, null),
      );
      await commandBus.execute(
        new UpdateReceiptCommand(ReceiptId.from(RECEIPT_ID_1), [
          {
            id: 'line-1',
            skuId: SKU_ID_A,
            packagingId: null,
            packageQuantity: 1,
            baseQuantity: Quantity.of(100, UnitOfMeasure.ML),
            unitCost: Money.rub('10.00'),
            expiresAt: null,
          },
        ]),
      );
      await commandBus.execute(new PostReceiptCommand(ReceiptId.from(RECEIPT_ID_1), USER_ID));

      await expect(
        commandBus.execute(new PostReceiptCommand(ReceiptId.from(RECEIPT_ID_1), USER_ID)),
      ).rejects.toThrow();
    });

    it('throws ReceiptNotFoundError for unknown receipt', async () => {
      await expect(
        commandBus.execute(new PostReceiptCommand(ReceiptId.from(RECEIPT_ID_1), USER_ID)),
      ).rejects.toBeInstanceOf(ReceiptNotFoundError);
    });
  });

  describe('CancelReceiptCommand', () => {
    it('cancels posted receipt when batches untouched', async () => {
      idGen.reset([RECEIPT_ID_1]);
      await commandBus.execute(
        new CreateReceiptCommand(SUPPLIER_ID, BRANCH_ID, USER_ID, null, null),
      );
      await commandBus.execute(
        new UpdateReceiptCommand(ReceiptId.from(RECEIPT_ID_1), [
          {
            id: 'line-1',
            skuId: SKU_ID_A,
            packagingId: null,
            packageQuantity: 1,
            baseQuantity: Quantity.of(100, UnitOfMeasure.ML),
            unitCost: Money.rub('10.00'),
            expiresAt: null,
          },
        ]),
      );
      await commandBus.execute(new PostReceiptCommand(ReceiptId.from(RECEIPT_ID_1), USER_ID));
      await client.query('truncate table outbox_events');

      await commandBus.execute(
        new CancelReceiptCommand(ReceiptId.from(RECEIPT_ID_1), 'Wrong delivery'),
      );

      const r = await client.query('select status from inv_receipts where id = $1', [RECEIPT_ID_1]);
      expect((r.rows[0] as Record<string, unknown>)['status']).toBe(ReceiptStatus.CANCELLED);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'ReceiptCancelled' }]);
    });

    it('rejects cancel when batches already consumed', async () => {
      idGen.reset([RECEIPT_ID_1]);
      await commandBus.execute(
        new CreateReceiptCommand(SUPPLIER_ID, BRANCH_ID, USER_ID, null, null),
      );
      await commandBus.execute(
        new UpdateReceiptCommand(ReceiptId.from(RECEIPT_ID_1), [
          {
            id: 'line-1',
            skuId: SKU_ID_A,
            packagingId: null,
            packageQuantity: 1,
            baseQuantity: Quantity.of(100, UnitOfMeasure.ML),
            unitCost: Money.rub('10.00'),
            expiresAt: null,
          },
        ]),
      );
      await commandBus.execute(new PostReceiptCommand(ReceiptId.from(RECEIPT_ID_1), USER_ID));
      batchUsagePort.markConsumed(RECEIPT_ID_1);

      await expect(
        commandBus.execute(new CancelReceiptCommand(ReceiptId.from(RECEIPT_ID_1), 'Try cancel')),
      ).rejects.toBeInstanceOf(ReceiptBatchesAlreadyConsumedError);
    });
  });

  describe('CreateAdjustmentCommand', () => {
    it('auto-approves when below threshold', async () => {
      idGen.reset([ADJUSTMENT_ID_1]);
      configPort.setThreshold(Money.rub('1000.00'));

      const result = await commandBus.execute<CreateAdjustmentCommand, { id: AdjustmentId }>(
        new CreateAdjustmentCommand(
          BRANCH_ID,
          'Inventory count',
          [
            {
              skuId: SKU_ID_A,
              delta: SignedQuantity.of(5, UnitOfMeasure.ML),
              snapshotUnitCost: Money.rub('10.00'),
            },
          ],
          USER_ID,
        ),
      );

      expect(result.id).toBe(ADJUSTMENT_ID_1);

      const r = await client.query('select status from inv_adjustments where id = $1', [
        ADJUSTMENT_ID_1,
      ]);
      expect((r.rows[0] as Record<string, unknown>)['status']).toBe(AdjustmentStatus.APPROVED);

      const events = await outboxEvents(client);
      const types = events.map((e) => e.event_type);
      expect(types).toContain('AdjustmentCreated');
      expect(types).toContain('AdjustmentApproved');
    });

    it('requires approval when above threshold', async () => {
      idGen.reset([ADJUSTMENT_ID_1]);
      configPort.setThreshold(Money.rub('1.00'));

      await commandBus.execute(
        new CreateAdjustmentCommand(
          BRANCH_ID,
          'Large adjust',
          [
            {
              skuId: SKU_ID_A,
              delta: SignedQuantity.of(100, UnitOfMeasure.ML),
              snapshotUnitCost: Money.rub('10.00'),
            },
          ],
          USER_ID,
        ),
      );

      const r = await client.query('select status from inv_adjustments where id = $1', [
        ADJUSTMENT_ID_1,
      ]);
      expect((r.rows[0] as Record<string, unknown>)['status']).toBe(AdjustmentStatus.PENDING);

      const events = await outboxEvents(client);
      const types = events.map((e) => e.event_type);
      expect(types).toContain('AdjustmentCreated');
      expect(types).not.toContain('AdjustmentApproved');
    });
  });

  describe('ApproveAdjustmentCommand', () => {
    it('approves pending adjustment', async () => {
      idGen.reset([ADJUSTMENT_ID_1]);
      configPort.setThreshold(Money.rub('1.00'));

      await commandBus.execute(
        new CreateAdjustmentCommand(
          BRANCH_ID,
          'Adjust',
          [
            {
              skuId: SKU_ID_A,
              delta: SignedQuantity.of(50, UnitOfMeasure.ML),
              snapshotUnitCost: Money.rub('10.00'),
            },
          ],
          USER_ID,
        ),
      );
      await client.query('truncate table outbox_events');

      await commandBus.execute(
        new ApproveAdjustmentCommand(AdjustmentId.from(ADJUSTMENT_ID_1), USER_ID),
      );

      const r = await client.query('select status from inv_adjustments where id = $1', [
        ADJUSTMENT_ID_1,
      ]);
      expect((r.rows[0] as Record<string, unknown>)['status']).toBe(AdjustmentStatus.APPROVED);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'AdjustmentApproved' }]);
    });

    it('throws AdjustmentNotFoundError for unknown id', async () => {
      await expect(
        commandBus.execute(
          new ApproveAdjustmentCommand(AdjustmentId.from(ADJUSTMENT_ID_1), USER_ID),
        ),
      ).rejects.toBeInstanceOf(AdjustmentNotFoundError);
    });
  });

  describe('RejectAdjustmentCommand', () => {
    it('rejects pending adjustment', async () => {
      idGen.reset([ADJUSTMENT_ID_1]);
      configPort.setThreshold(Money.rub('1.00'));

      await commandBus.execute(
        new CreateAdjustmentCommand(
          BRANCH_ID,
          'Adjust',
          [
            {
              skuId: SKU_ID_A,
              delta: SignedQuantity.of(50, UnitOfMeasure.ML),
              snapshotUnitCost: Money.rub('10.00'),
            },
          ],
          USER_ID,
        ),
      );
      await client.query('truncate table outbox_events');

      await commandBus.execute(
        new RejectAdjustmentCommand(AdjustmentId.from(ADJUSTMENT_ID_1), USER_ID, 'Not valid'),
      );

      const r = await client.query('select status from inv_adjustments where id = $1', [
        ADJUSTMENT_ID_1,
      ]);
      expect((r.rows[0] as Record<string, unknown>)['status']).toBe(AdjustmentStatus.REJECTED);

      const events = await outboxEvents(client);
      expect(events).toMatchObject([{ event_type: 'AdjustmentRejected' }]);
    });
  });
});
