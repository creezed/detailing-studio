import crypto from 'node:crypto';

import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';

import {
  Adjustment,
  AdjustmentId,
  AdjustmentLine,
  AdjustmentStatus,
  BatchSourceType,
  SignedQuantity,
  Stock,
  StockTaking,
  StockTakingId,
  StockTakingLine,
  StockTakingPosted,
  StockTakingStatus,
  Transfer,
  TransferId,
  TransferLine,
  TransferPosted,
  TransferStatus,
} from '@det/backend-inventory-domain';
import type {
  IAdjustmentRepository,
  IBatchSelector,
  IReceiptRepository,
  IStockRepository,
  IStockTakingRepository,
  ITransferRepository,
  BatchAllocation,
} from '@det/backend-inventory-domain';
import { DateTime, Money, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { DomainEvent, IClock, IIdGenerator } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import { CancelStockTakingCommand } from '../../commands/cancel-stock-taking/cancel-stock-taking.command';
import { CreateTransferCommand } from '../../commands/create-transfer/create-transfer.command';
import { PostStockTakingCommand } from '../../commands/post-stock-taking/post-stock-taking.command';
import { PostTransferCommand } from '../../commands/post-transfer/post-transfer.command';
import { RecordStockTakingMeasurementCommand } from '../../commands/record-stock-taking-measurement/record-stock-taking-measurement.command';
import { StartStockTakingCommand } from '../../commands/start-stock-taking/start-stock-taking.command';
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
  ReceiptNotFoundError,
  StockTakingNotFoundError,
  TransferNotFoundError,
} from '../../errors/application.errors';
import { InventoryApplicationModule } from '../../inventory-application.module';
import { GetLowStockReportQuery } from '../../queries/get-low-stock-report/get-low-stock-report.query';
import { GetReceiptByIdQuery } from '../../queries/get-receipt-by-id/get-receipt-by-id.query';
import { GetStockByBranchQuery } from '../../queries/get-stock-by-branch/get-stock-by-branch.query';
import { GetStockOnDateQuery } from '../../queries/get-stock-on-date/get-stock-on-date.query';
import { GetStockTakingByIdQuery } from '../../queries/get-stock-taking-by-id/get-stock-taking-by-id.query';
import { ListAdjustmentsQuery } from '../../queries/list-adjustments/list-adjustments.query';
import { ListMovementsQuery } from '../../queries/list-movements/list-movements.query';
import { ListPendingApprovalsQuery } from '../../queries/list-pending-approvals/list-pending-approvals.query';
import { ListReceiptsQuery } from '../../queries/list-receipts/list-receipts.query';
import { ListStockTakingsQuery } from '../../queries/list-stock-takings/list-stock-takings.query';
import { ListTransfersQuery } from '../../queries/list-transfers/list-transfers.query';

import type { IBatchUsagePort } from '../../ports/batch-usage.port';
import type { IIdempotencyPort } from '../../ports/idempotency.port';
import type { IInventoryConfigPort } from '../../ports/inventory-config.port';
import type { IStockSnapshotPort, StockSnapshotLine } from '../../ports/stock-snapshot.port';
import type { TestingModule } from '@nestjs/testing';
import type { StartedTestContainer } from 'testcontainers';

const TRANSFER_ID_1 = '11111111-1111-4111-8111-111111111111';
const ST_ID_1 = '22222222-2222-4222-8222-222222222222';
const ADJ_ID_AUTO = '33333333-3333-4333-8333-333333333333';
const FROM_BRANCH = '44444444-4444-4444-8444-444444444444' as unknown as BranchId;
const TO_BRANCH = '55555555-5555-4555-8555-555555555555' as unknown as BranchId;
const BRANCH_A = FROM_BRANCH;
const USER_ID = '66666666-6666-4666-8666-666666666666' as unknown as UserId;
const SKU_ID_A = '77777777-7777-4777-8777-777777777777' as unknown as SkuId;
const SKU_ID_B = '88888888-8888-4888-8888-888888888888' as unknown as SkuId;
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

class InMemoryTransferRepository implements ITransferRepository {
  constructor(private readonly client: Client) {}

  async findById(id: TransferId): Promise<Transfer | null> {
    const r = await this.client.query('select * from inv_transfers where id = $1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;

    if (!row) return null;

    const linesRes = await this.client.query(
      'select * from inv_transfer_lines where transfer_id = $1',
      [id],
    );

    const lines = (linesRes.rows as Record<string, unknown>[]).map((l) =>
      TransferLine.create(
        l['sku_id'] as SkuId,
        Quantity.of(Number(l['quantity']), l['unit'] as UnitOfMeasure),
      ),
    );

    return Transfer.restore(
      TransferId.from(row['id'] as string),
      row['from_branch_id'] as BranchId,
      row['to_branch_id'] as BranchId,
      row['status'] as TransferStatus,
      lines,
      row['created_by'] as UserId,
      DateTime.from(row['created_at'] as string),
      row['posted_by'] ? (row['posted_by'] as unknown as UserId) : null,
      row['posted_at'] ? DateTime.from(row['posted_at'] as string) : null,
    );
  }

  async save(transfer: Transfer): Promise<void> {
    const events = transfer.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into inv_transfers (id, from_branch_id, to_branch_id, status, created_by, created_at, posted_by, posted_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set
           status=excluded.status, posted_by=excluded.posted_by, posted_at=excluded.posted_at`,
        [
          transfer.id,
          transfer.fromBranchId,
          transfer.toBranchId,
          transfer.status,
          USER_ID,
          NOW.toDate(),
          transfer.status === TransferStatus.POSTED ? USER_ID : null,
          transfer.status === TransferStatus.POSTED ? NOW.toDate() : null,
        ],
      );

      await this.client.query('delete from inv_transfer_lines where transfer_id = $1', [
        transfer.id,
      ]);

      for (const line of transfer.lines) {
        await this.client.query(
          `insert into inv_transfer_lines (transfer_id, sku_id, quantity, unit)
           values ($1,$2,$3,$4)`,
          [transfer.id, line.skuId, line.quantity.amount, line.quantity.unit],
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

class InMemoryStockTakingRepository implements IStockTakingRepository {
  constructor(private readonly client: Client) {}

  async findById(id: StockTakingId): Promise<StockTaking | null> {
    const r = await this.client.query('select * from inv_stock_takings where id = $1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;

    if (!row) return null;

    const linesRes = await this.client.query(
      'select * from inv_stock_taking_lines where stock_taking_id = $1',
      [id],
    );

    const lines = (linesRes.rows as Record<string, unknown>[]).map((l) => {
      const stLine = StockTakingLine.create(
        l['sku_id'] as SkuId,
        Quantity.of(Number(l['expected_quantity']), l['unit'] as UnitOfMeasure),
      );

      if (l['actual_quantity'] !== null) {
        stLine.recordActual(Quantity.of(Number(l['actual_quantity']), l['unit'] as UnitOfMeasure));
      }

      return stLine;
    });

    return StockTaking.restore(
      StockTakingId.from(row['id'] as string),
      row['branch_id'] as BranchId,
      row['status'] as StockTakingStatus,
      lines,
      row['created_by'] as UserId,
      DateTime.from(row['started_at'] as string),
      row['completed_at'] ? DateTime.from(row['completed_at'] as string) : null,
    );
  }

  async save(st: StockTaking): Promise<void> {
    const events = st.pullDomainEvents();

    await this.client.query('begin');

    try {
      await this.client.query(
        `insert into inv_stock_takings (id, branch_id, status, created_by, started_at, completed_at)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (id) do update set
           status=excluded.status, completed_at=excluded.completed_at`,
        [
          st.id,
          BRANCH_A,
          st.status,
          USER_ID,
          NOW.toDate(),
          st.status !== StockTakingStatus.STARTED ? NOW.toDate() : null,
        ],
      );

      await this.client.query('delete from inv_stock_taking_lines where stock_taking_id = $1', [
        st.id,
      ]);

      for (const line of st.lines) {
        await this.client.query(
          `insert into inv_stock_taking_lines (stock_taking_id, sku_id, expected_quantity, actual_quantity, unit)
           values ($1,$2,$3,$4,$5)`,
          [
            st.id,
            line.skuId,
            line.expectedQuantity.amount,
            line.actualQuantity?.amount ?? null,
            line.expectedQuantity.unit,
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

class InMemoryStockRepository implements IStockRepository {
  constructor(private readonly client: Client) {}

  async findByCompositeId(skuId: SkuId, branchId: BranchId): Promise<Stock | null> {
    const r = await this.client.query(
      'select * from inv_stocks where sku_id = $1 and branch_id = $2',
      [skuId, branchId],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;

    if (!row) return null;

    const batchRows = await this.client.query(
      'select * from inv_stock_batches where sku_id = $1 and branch_id = $2',
      [skuId, branchId],
    );

    const batches = (batchRows.rows as Record<string, unknown>[]).map((b) => ({
      id: b['id'] as string,
      supplierId: (b['supplier_id'] as string | null) ?? null,
      sourceType: b['source_type'] as BatchSourceType,
      sourceDocId: b['source_doc_id'] as string,
      initialQuantity: Number(b['initial_quantity']),
      remainingQuantity: Number(b['remaining_quantity']),
      unitCostCents: b['unit_cost_cents'] as string,
      expiresAt: b['expires_at'] ? (b['expires_at'] as string) : null,
      receivedAt: b['received_at'] as string,
    }));

    return Stock.restore({
      averageCostCents: row['average_cost_cents'] as string,
      baseUnit: row['base_unit'] as UnitOfMeasure,
      batches,
      branchId: row['branch_id'] as string,
      reorderLevel: Number(row['reorder_level']),
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

      await this.client.query(
        'delete from inv_stock_batches where sku_id = $1 and branch_id = $2',
        [snapshot.skuId, snapshot.branchId],
      );

      for (const b of snapshot.batches) {
        await this.client.query(
          `insert into inv_stock_batches (id, sku_id, branch_id, supplier_id, source_type, source_doc_id,
            initial_quantity, remaining_quantity, unit_cost_cents, expires_at, received_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            b.id,
            snapshot.skuId,
            snapshot.branchId,
            b.supplierId,
            b.sourceType,
            b.sourceDocId,
            b.initialQuantity,
            b.remainingQuantity,
            b.unitCostCents,
            b.expiresAt,
            b.receivedAt,
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

  findLowStock(): Promise<readonly Stock[]> {
    return Promise.resolve([]);
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
          BRANCH_A,
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
  adjustmentAutoApprovalThreshold(): Money {
    return Money.rub('100.00');
  }
}

class InMemoryStockSnapshotPort implements IStockSnapshotPort {
  private _lines: StockSnapshotLine[] = [];

  setLines(lines: StockSnapshotLine[]): void {
    this._lines = lines;
  }

  snapshotForBranch(): Promise<readonly StockSnapshotLine[]> {
    return Promise.resolve(this._lines);
  }
}

const fifoBatchSelector: IBatchSelector = {
  selectForConsumption: (batches, amount) => {
    let remaining = amount.amount;
    const allocations: BatchAllocation[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const take = Math.min(remaining, batch.remainingQuantity.amount);

      allocations.push({
        batchId: batch.id,
        quantity: Quantity.of(take, amount.unit),
        unitCost: batch.unitCost,
      });
      remaining -= take;
    }

    return allocations;
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
    create table if not exists inv_transfers (
      id uuid primary key,
      from_branch_id uuid not null,
      to_branch_id uuid not null,
      status text not null,
      created_by uuid not null,
      created_at timestamptz not null,
      posted_by uuid,
      posted_at timestamptz
    );

    create table if not exists inv_transfer_lines (
      transfer_id uuid not null references inv_transfers(id),
      sku_id uuid not null,
      quantity numeric not null,
      unit text not null
    );

    create table if not exists inv_stock_takings (
      id uuid primary key,
      branch_id uuid not null,
      status text not null,
      created_by uuid not null,
      started_at timestamptz not null,
      completed_at timestamptz
    );

    create table if not exists inv_stock_taking_lines (
      stock_taking_id uuid not null references inv_stock_takings(id),
      sku_id uuid not null,
      expected_quantity numeric not null,
      actual_quantity numeric,
      unit text not null
    );

    create table if not exists inv_stocks (
      sku_id uuid not null,
      branch_id uuid not null,
      base_unit text not null,
      reorder_level numeric not null default 0,
      average_cost_cents text not null default '0',
      primary key (sku_id, branch_id)
    );

    create table if not exists inv_stock_batches (
      id text not null,
      sku_id uuid not null,
      branch_id uuid not null,
      supplier_id uuid,
      source_type text not null,
      source_doc_id text not null,
      initial_quantity numeric not null,
      remaining_quantity numeric not null,
      unit_cost_cents text not null,
      expires_at text,
      received_at text not null
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
    'truncate table outbox_events, inv_adjustment_lines, inv_adjustments, inv_stock_taking_lines, inv_stock_takings, inv_transfer_lines, inv_transfers, inv_stock_batches, inv_stocks',
  );
}

async function outboxEvents(client: Client): Promise<readonly { event_type: string }[]> {
  const result = await client.query<{ event_type: string }>(
    'select event_type from outbox_events order by occurred_at, id',
  );

  return result.rows;
}

describe('Transfer & StockTaking integration', () => {
  let container: StartedTestContainer;
  let client: Client;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;
  let moduleRef: TestingModule;
  let idGen: QueueIdGenerator;
  let snapshotPort: InMemoryStockSnapshotPort;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_DB: 'inv_ts', POSTGRES_PASSWORD: 'inv', POSTGRES_USER: 'inv' })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start();

    client = new Client({
      database: 'inv_ts',
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
    snapshotPort = new InMemoryStockSnapshotPort();

    const transferRepo = new InMemoryTransferRepository(client);
    const stockTakingRepo = new InMemoryStockTakingRepository(client);
    const stockRepo = new InMemoryStockRepository(client);
    const adjustmentRepo = new InMemoryAdjustmentRepository(client);
    const idempotency = new InMemoryIdempotencyPort();

    moduleRef = await Test.createTestingModule({
      imports: [
        InventoryApplicationModule.register([
          { provide: TRANSFER_REPOSITORY, useValue: transferRepo },
          { provide: STOCK_TAKING_REPOSITORY, useValue: stockTakingRepo },
          { provide: STOCK_REPOSITORY, useValue: stockRepo },
          { provide: ADJUSTMENT_REPOSITORY, useValue: adjustmentRepo },
          { provide: BATCH_SELECTOR, useValue: fifoBatchSelector },
          { provide: IDEMPOTENCY_PORT, useValue: idempotency },
          { provide: STOCK_SNAPSHOT_PORT, useValue: snapshotPort },
          { provide: INVENTORY_CONFIG_PORT, useValue: new InMemoryConfigPort() },
          {
            provide: BATCH_USAGE_PORT,
            useValue: { areBatchesUntouched: () => Promise.resolve(true) } as IBatchUsagePort,
          },
          { provide: RECEIPT_REPOSITORY, useValue: {} as IReceiptRepository },
          { provide: SKU_REPOSITORY, useValue: {} },
          { provide: SUPPLIER_REPOSITORY, useValue: {} },
          { provide: SKU_READ_PORT, useValue: {} },
          { provide: SUPPLIER_READ_PORT, useValue: {} },
          {
            provide: RECEIPT_READ_PORT,
            useValue: {
              list: () => Promise.resolve({ items: [], total: 0 }),
              findById: () => Promise.resolve(null),
            },
          },
          {
            provide: ADJUSTMENT_READ_PORT,
            useValue: {
              list: () => Promise.resolve({ items: [], total: 0 }),
              listPendingApprovals: () => Promise.resolve({ items: [], total: 0 }),
            },
          },
          {
            provide: TRANSFER_READ_PORT,
            useValue: { list: () => Promise.resolve({ items: [], total: 0 }) },
          },
          {
            provide: STOCK_TAKING_READ_PORT,
            useValue: {
              list: () => Promise.resolve({ items: [], total: 0 }),
              findById: () => Promise.resolve(null),
            },
          },
          {
            provide: STOCK_READ_PORT,
            useValue: {
              getByBranch: () => Promise.resolve({ items: [], total: 0 }),
              getLowStock: () => Promise.resolve({ items: [], total: 0 }),
              getOnDate: () => Promise.resolve([]),
            },
          },
          {
            provide: MOVEMENT_READ_PORT,
            useValue: { list: () => Promise.resolve({ items: [], total: 0 }) },
          },
          { provide: CLOCK, useValue: new FixedClock() },
          { provide: ID_GENERATOR, useValue: idGen },
        ]),
      ],
    }).compile();
    await moduleRef.init();

    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
    eventBus = moduleRef.get(EventBus);
  });

  afterEach(async () => {
    await moduleRef.close().catch(() => {});
  });

  describe('CreateTransferCommand', () => {
    it('creates a DRAFT transfer with TransferCreated outbox event', async () => {
      idGen.reset([TRANSFER_ID_1]);

      const result = await commandBus.execute<CreateTransferCommand, { id: TransferId }>(
        new CreateTransferCommand(
          FROM_BRANCH,
          TO_BRANCH,
          [{ skuId: SKU_ID_A, quantity: Quantity.of(100, UnitOfMeasure.ML) }],
          USER_ID,
        ),
      );

      expect(result.id).toBe(TRANSFER_ID_1);

      const row = await client.query('select * from inv_transfers where id = $1', [TRANSFER_ID_1]);

      expect(row.rows).toHaveLength(1);
      expect(row.rows[0]).toMatchObject({ status: 'DRAFT' });

      const lines = await client.query('select * from inv_transfer_lines where transfer_id = $1', [
        TRANSFER_ID_1,
      ]);

      expect(lines.rows).toHaveLength(1);
      expect(lines.rows[0]).toMatchObject({ sku_id: SKU_ID_A });

      const events = await outboxEvents(client);

      expect(events.map((e) => e.event_type)).toEqual(['TransferCreated']);
    });

    it('rejects transfer to the same branch', async () => {
      idGen.reset([TRANSFER_ID_1]);

      await expect(
        commandBus.execute(
          new CreateTransferCommand(
            FROM_BRANCH,
            FROM_BRANCH,
            [{ skuId: SKU_ID_A, quantity: Quantity.of(100, UnitOfMeasure.ML) }],
            USER_ID,
          ),
        ),
      ).rejects.toThrow();
    });

    it('rejects empty transfer lines', async () => {
      idGen.reset([TRANSFER_ID_1]);

      await expect(
        commandBus.execute(new CreateTransferCommand(FROM_BRANCH, TO_BRANCH, [], USER_ID)),
      ).rejects.toThrow();
    });
  });

  describe('PostTransferCommand', () => {
    it('posts a DRAFT transfer with TransferPosted outbox event', async () => {
      idGen.reset([TRANSFER_ID_1]);

      await commandBus.execute(
        new CreateTransferCommand(
          FROM_BRANCH,
          TO_BRANCH,
          [{ skuId: SKU_ID_A, quantity: Quantity.of(50, UnitOfMeasure.ML) }],
          USER_ID,
        ),
      );

      await commandBus.execute(new PostTransferCommand(TransferId.from(TRANSFER_ID_1), USER_ID));

      const row = await client.query('select status from inv_transfers where id = $1', [
        TRANSFER_ID_1,
      ]);

      expect(row.rows[0]).toMatchObject({ status: 'POSTED' });

      const events = await outboxEvents(client);

      expect(events.map((e) => e.event_type)).toEqual(['TransferCreated', 'TransferPosted']);
    });

    it('throws TransferNotFoundError for non-existent transfer', async () => {
      await expect(
        commandBus.execute(new PostTransferCommand(TransferId.from(TRANSFER_ID_1), USER_ID)),
      ).rejects.toThrow(TransferNotFoundError);
    });
  });

  describe('ApplyTransferSaga', () => {
    it('creates Stock records for both branches on TransferPosted event', async () => {
      await client.query(
        `insert into inv_stocks (sku_id, branch_id, base_unit, reorder_level, average_cost_cents)
         values ($1,$2,$3,$4,$5)`,
        [SKU_ID_A, FROM_BRANCH, UnitOfMeasure.ML, 0, '10000'],
      );
      await client.query(
        `insert into inv_stock_batches (id, sku_id, branch_id, supplier_id, source_type, source_doc_id,
          initial_quantity, remaining_quantity, unit_cost_cents, expires_at, received_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          SKU_ID_A,
          FROM_BRANCH,
          null,
          BatchSourceType.RECEIPT,
          'SEED',
          100,
          100,
          '10000',
          null,
          NOW.iso(),
        ],
      );

      const event = new TransferPosted(
        TransferId.from(TRANSFER_ID_1),
        FROM_BRANCH,
        TO_BRANCH,
        [{ skuId: SKU_ID_A, quantity: Quantity.of(50, UnitOfMeasure.ML) }],
        USER_ID,
        NOW,
      );

      eventBus.publish(event);
      await sleep(300);

      const fromStock = await client.query(
        'select * from inv_stocks where sku_id = $1 and branch_id = $2',
        [SKU_ID_A, FROM_BRANCH],
      );
      const toStock = await client.query(
        'select * from inv_stocks where sku_id = $1 and branch_id = $2',
        [SKU_ID_A, TO_BRANCH],
      );

      expect(fromStock.rows).toHaveLength(1);
      expect(toStock.rows).toHaveLength(1);
    });
  });

  describe('StartStockTakingCommand', () => {
    it('creates STARTED stock taking with snapshot lines', async () => {
      idGen.reset([ST_ID_1]);
      snapshotPort.setLines([
        { skuId: SKU_ID_A, currentQuantity: Quantity.of(100, UnitOfMeasure.ML) },
        { skuId: SKU_ID_B, currentQuantity: Quantity.of(200, UnitOfMeasure.ML) },
      ]);

      const result = await commandBus.execute<StartStockTakingCommand, { id: StockTakingId }>(
        new StartStockTakingCommand(BRANCH_A, USER_ID),
      );

      expect(result.id).toBe(ST_ID_1);

      const row = await client.query('select * from inv_stock_takings where id = $1', [ST_ID_1]);

      expect(row.rows).toHaveLength(1);
      expect(row.rows[0]).toMatchObject({ status: 'STARTED' });

      const lines = await client.query(
        'select * from inv_stock_taking_lines where stock_taking_id = $1 order by sku_id',
        [ST_ID_1],
      );

      expect(lines.rows).toHaveLength(2);

      const events = await outboxEvents(client);

      expect(events.map((e) => e.event_type)).toEqual(['StockTakingStarted']);
    });
  });

  describe('RecordStockTakingMeasurementCommand', () => {
    it('records actual quantity for a SKU', async () => {
      idGen.reset([ST_ID_1]);
      snapshotPort.setLines([
        { skuId: SKU_ID_A, currentQuantity: Quantity.of(100, UnitOfMeasure.ML) },
      ]);

      await commandBus.execute(new StartStockTakingCommand(BRANCH_A, USER_ID));

      await commandBus.execute(
        new RecordStockTakingMeasurementCommand(
          StockTakingId.from(ST_ID_1),
          SKU_ID_A,
          Quantity.of(90, UnitOfMeasure.ML),
        ),
      );

      const lines = await client.query(
        'select actual_quantity from inv_stock_taking_lines where stock_taking_id = $1 and sku_id = $2',
        [ST_ID_1, SKU_ID_A],
      );

      expect(Number(lines.rows[0]?.['actual_quantity'])).toBe(90);
    });

    it('throws StockTakingNotFoundError for non-existent stock taking', async () => {
      await expect(
        commandBus.execute(
          new RecordStockTakingMeasurementCommand(
            StockTakingId.from(ST_ID_1),
            SKU_ID_A,
            Quantity.of(90, UnitOfMeasure.ML),
          ),
        ),
      ).rejects.toThrow(StockTakingNotFoundError);
    });
  });

  describe('PostStockTakingCommand', () => {
    it('posts stock taking with StockTakingPosted event', async () => {
      idGen.reset([ST_ID_1]);
      snapshotPort.setLines([
        { skuId: SKU_ID_A, currentQuantity: Quantity.of(100, UnitOfMeasure.ML) },
      ]);

      await commandBus.execute(new StartStockTakingCommand(BRANCH_A, USER_ID));

      await commandBus.execute(
        new RecordStockTakingMeasurementCommand(
          StockTakingId.from(ST_ID_1),
          SKU_ID_A,
          Quantity.of(90, UnitOfMeasure.ML),
        ),
      );

      await commandBus.execute(new PostStockTakingCommand(StockTakingId.from(ST_ID_1), USER_ID));

      const row = await client.query('select status from inv_stock_takings where id = $1', [
        ST_ID_1,
      ]);

      expect(row.rows[0]).toMatchObject({ status: 'POSTED' });

      const events = await outboxEvents(client);
      const eventTypes = events.map((e) => e.event_type);

      expect(eventTypes).toContain('StockTakingPosted');
    });
  });

  describe('CancelStockTakingCommand', () => {
    it('cancels a STARTED stock taking', async () => {
      idGen.reset([ST_ID_1]);
      snapshotPort.setLines([
        { skuId: SKU_ID_A, currentQuantity: Quantity.of(100, UnitOfMeasure.ML) },
      ]);

      await commandBus.execute(new StartStockTakingCommand(BRANCH_A, USER_ID));

      await commandBus.execute(new CancelStockTakingCommand(StockTakingId.from(ST_ID_1)));

      const row = await client.query('select status from inv_stock_takings where id = $1', [
        ST_ID_1,
      ]);

      expect(row.rows[0]).toMatchObject({ status: 'CANCELLED' });

      const events = await outboxEvents(client);

      const eventTypes = events.map((e) => e.event_type);

      expect(eventTypes).toContain('StockTakingStarted');
      expect(eventTypes).toContain('StockTakingCancelled');
    });

    it('throws StockTakingNotFoundError for non-existent stock taking', async () => {
      await expect(
        commandBus.execute(new CancelStockTakingCommand(StockTakingId.from(ST_ID_1))),
      ).rejects.toThrow(StockTakingNotFoundError);
    });
  });

  describe('ApplyStockTakingSaga', () => {
    it('creates and auto-approves an Adjustment on StockTakingPosted', async () => {
      idGen.reset([ST_ID_1, ADJ_ID_AUTO]);
      snapshotPort.setLines([
        { skuId: SKU_ID_A, currentQuantity: Quantity.of(100, UnitOfMeasure.ML) },
      ]);

      await commandBus.execute(new StartStockTakingCommand(BRANCH_A, USER_ID));

      await commandBus.execute(
        new RecordStockTakingMeasurementCommand(
          StockTakingId.from(ST_ID_1),
          SKU_ID_A,
          Quantity.of(80, UnitOfMeasure.ML),
        ),
      );

      await commandBus.execute(new PostStockTakingCommand(StockTakingId.from(ST_ID_1), USER_ID));

      const stPostedEvent = new StockTakingPosted(
        StockTakingId.from(ST_ID_1),
        BRANCH_A,
        [{ skuId: SKU_ID_A, delta: SignedQuantity.of(-20, UnitOfMeasure.ML) }],
        USER_ID,
        NOW,
      );

      eventBus.publish(stPostedEvent);
      await sleep(300);

      const adjustments = await client.query('select * from inv_adjustments');

      expect(adjustments.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Query handlers', () => {
    it('ListTransfersQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(new ListTransfersQuery(0, 10));

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('ListStockTakingsQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(new ListStockTakingsQuery(0, 10));

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('GetStockTakingByIdQuery throws StockTakingNotFoundError', async () => {
      await expect(queryBus.execute(new GetStockTakingByIdQuery(ST_ID_1))).rejects.toThrow(
        StockTakingNotFoundError,
      );
    });

    it('GetReceiptByIdQuery throws ReceiptNotFoundError', async () => {
      await expect(queryBus.execute(new GetReceiptByIdQuery(TRANSFER_ID_1))).rejects.toThrow(
        ReceiptNotFoundError,
      );
    });

    it('ListReceiptsQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(new ListReceiptsQuery(0, 10));

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('ListAdjustmentsQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(new ListAdjustmentsQuery(0, 10));

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('ListPendingApprovalsQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(new ListPendingApprovalsQuery(0, 10));

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('GetStockByBranchQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(
        new GetStockByBranchQuery(FROM_BRANCH as unknown as string, 0, 10),
      );

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('GetLowStockReportQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(new GetLowStockReportQuery(0, 10));

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('GetStockOnDateQuery returns empty array', async () => {
      const result = await queryBus.execute(
        new GetStockOnDateQuery(FROM_BRANCH as unknown as string, '2026-01-01'),
      );

      expect(result).toEqual([]);
    });

    it('ListMovementsQuery returns empty paginated result', async () => {
      const result = await queryBus.execute(new ListMovementsQuery(0, 10));

      expect(result).toEqual({ items: [], total: 0 });
    });
  });
});
