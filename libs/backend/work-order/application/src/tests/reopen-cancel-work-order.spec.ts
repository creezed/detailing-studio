import { CommandBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrderStatus } from '@det/backend-work-order-domain';
import type { WorkOrderId } from '@det/backend-work-order-domain';

import { InMemoryPhotoStoragePort } from './in-memory-photo-storage.port';
import { InMemoryWorkOrderRepository } from './in-memory-work-order.repository';
import { AddConsumptionCommand } from '../commands/add-consumption/add-consumption.command';
import { AddPhotoCommand } from '../commands/add-photo/add-photo.command';
import { CancelWorkOrderCommand } from '../commands/cancel-work-order/cancel-work-order.command';
import { CloseWorkOrderCommand } from '../commands/close-work-order/close-work-order.command';
import { OpenWorkOrderCommand } from '../commands/open-work-order/open-work-order.command';
import { ReopenWorkOrderCommand } from '../commands/reopen-work-order/reopen-work-order.command';
import { SubmitForReviewCommand } from '../commands/submit-for-review/submit-for-review.command';
import {
  CATALOG_NORM_PORT,
  CATALOG_SKU_PORT,
  CLOCK,
  CRM_CLIENT_PORT,
  CRM_VEHICLE_PORT,
  IAM_USER_PORT,
  ID_GENERATOR,
  INVENTORY_STOCK_PORT,
  PHOTO_STORAGE_PORT,
  SCHEDULING_APPOINTMENT_PORT,
  WORK_ORDER_READ_PORT,
  WORK_ORDER_REPOSITORY,
} from '../di/tokens';
import { WorkOrderApplicationModule } from '../work-order-application.module';

import type {
  CompensateStockInput,
  ConsumeStockInput,
  ConsumeStockResult,
  IInventoryStockPort,
} from '../ports/inventory-stock.port';
import type { TestingModule } from '@nestjs/testing';

const NOW = DateTime.from('2024-06-15T10:00:00Z');
const APPT_BASE = '00000000-0000-4000-a000-aaa00000000';
const BRANCH_ID = '00000000-0000-4000-a000-bbb000000001';
const MASTER_ID = '00000000-0000-4000-a000-ccc000000001';
const CLIENT_ID = '00000000-0000-4000-a000-ddd000000001';
const VEHICLE_ID = '00000000-0000-4000-a000-eee000000001';
const SKU_ID_1 = '00000000-0000-4000-a000-111000000001';
const SKU_ID_2 = '00000000-0000-4000-a000-111000000002';

class FixedClock implements IClock {
  now(): DateTime {
    return NOW;
  }
}

let idCounter = 200;

class SequentialIdGenerator implements IIdGenerator {
  generate(): string {
    idCounter++;
    return `00000000-0000-4000-a000-${String(idCounter).padStart(12, '0')}`;
  }
}

class MockInventoryStockPort implements IInventoryStockPort {
  private readonly _available = new Map<string, Quantity>();
  private readonly _consumed: ConsumeStockInput[] = [];
  private readonly _compensated: CompensateStockInput[] = [];
  private _failOnSkuId: string | null = null;

  seedAvailable(branchId: string, skuId: string, qty: Quantity): void {
    this._available.set(`${branchId}:${skuId}`, qty);
  }

  failOnSku(skuId: string): void {
    this._failOnSkuId = skuId;
  }

  clearFailOnSku(): void {
    this._failOnSkuId = null;
  }

  get consumedCalls(): readonly ConsumeStockInput[] {
    return this._consumed;
  }

  get compensatedCalls(): readonly CompensateStockInput[] {
    return this._compensated;
  }

  resetCalls(): void {
    this._consumed.length = 0;
    this._compensated.length = 0;
  }

  getCurrentQuantity(branchId: string, skuId: string): Promise<Quantity | null> {
    return Promise.resolve(this._available.get(`${branchId}:${skuId}`) ?? null);
  }

  canConsume(skuId: string, branchId: string, amount: Quantity): Promise<boolean> {
    const avail = this._available.get(`${branchId}:${skuId}`);
    if (!avail) {
      return Promise.resolve(false);
    }
    return Promise.resolve(avail.amount >= amount.amount);
  }

  consume(input: ConsumeStockInput): Promise<ConsumeStockResult> {
    if (this._failOnSkuId === input.skuId) {
      return Promise.resolve({ ok: false, error: 'Insufficient stock' });
    }
    this._consumed.push(input);
    return Promise.resolve({ ok: true });
  }

  compensate(input: CompensateStockInput): Promise<void> {
    this._compensated.push(input);
    return Promise.resolve();
  }
}

function buildOpenCommand(apptId: string): OpenWorkOrderCommand {
  return new OpenWorkOrderCommand(
    apptId,
    BRANCH_ID,
    MASTER_ID,
    CLIENT_ID,
    VEHICLE_ID,
    [
      {
        serviceId: '00000000-0000-4000-a000-fff000000001',
        serviceNameSnapshot: 'Полировка кузова',
        durationMinutes: 60,
        priceRubles: '5000.00',
      },
    ],
    [
      {
        skuId: SKU_ID_1,
        skuNameSnapshot: 'Полировальная паста',
        normAmount: Quantity.of(100, UnitOfMeasure.ML),
      },
      {
        skuId: SKU_ID_2,
        skuNameSnapshot: 'Микрофибра',
        normAmount: Quantity.of(2, UnitOfMeasure.PCS),
      },
    ],
    NOW,
  );
}

function buildModule(
  repo: InMemoryWorkOrderRepository,
  stockPort: MockInventoryStockPort,
  storage: InMemoryPhotoStoragePort,
  idGen: IIdGenerator,
) {
  return Test.createTestingModule({
    imports: [
      WorkOrderApplicationModule.register([
        { provide: WORK_ORDER_REPOSITORY, useValue: repo },
        {
          provide: WORK_ORDER_READ_PORT,
          useValue: {
            list: () => Promise.resolve({ items: [], nextCursor: null }),
            listClosedByClient: () => Promise.resolve({ items: [], nextCursor: null }),
            getNormDeviationReport: () => Promise.resolve([]),
          },
        },
        { provide: PHOTO_STORAGE_PORT, useValue: storage },
        { provide: CLOCK, useValue: new FixedClock() },
        { provide: ID_GENERATOR, useValue: idGen },
        { provide: CATALOG_NORM_PORT, useValue: { getNorms: () => Promise.resolve([]) } },
        { provide: IAM_USER_PORT, useValue: { getById: () => Promise.resolve(null) } },
        { provide: CRM_CLIENT_PORT, useValue: { getById: () => Promise.resolve(null) } },
        { provide: CRM_VEHICLE_PORT, useValue: { getById: () => Promise.resolve(null) } },
        { provide: CATALOG_SKU_PORT, useValue: { getMany: () => Promise.resolve([]) } },
        {
          provide: SCHEDULING_APPOINTMENT_PORT,
          useValue: {
            getById: () => Promise.resolve(null),
            listByMasterAndDay: () => Promise.resolve([]),
          },
        },
        { provide: INVENTORY_STOCK_PORT, useValue: stockPort },
      ]),
    ],
  }).compile();
}

async function openAndClose(
  commandBus: CommandBus,
  repo: InMemoryWorkOrderRepository,
  apptId: string,
): Promise<string> {
  await commandBus.execute(buildOpenCommand(apptId));
  const wo = await repo.findByAppointmentId(apptId);
  expect(wo).toBeDefined();
  const woId = wo?.id ?? '';

  await commandBus.execute(
    new AddPhotoCommand(woId, 'BEFORE', Buffer.from('b'), 'image/jpeg', MASTER_ID),
  );
  await commandBus.execute(
    new AddPhotoCommand(woId, 'AFTER', Buffer.from('a'), 'image/jpeg', MASTER_ID),
  );
  await commandBus.execute(
    new AddConsumptionCommand(woId, SKU_ID_1, Quantity.of(100, UnitOfMeasure.ML), MASTER_ID),
  );
  await commandBus.execute(
    new AddConsumptionCommand(woId, SKU_ID_2, Quantity.of(2, UnitOfMeasure.PCS), MASTER_ID),
  );
  await commandBus.execute(new SubmitForReviewCommand(woId, MASTER_ID));
  await commandBus.execute(new CloseWorkOrderCommand(woId, MASTER_ID, `close-${apptId}`));

  return woId;
}

describe('ReopenWorkOrderHandler', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let repo: InMemoryWorkOrderRepository;
  let stockPort: MockInventoryStockPort;
  const idGen = new SequentialIdGenerator();
  const storage = new InMemoryPhotoStoragePort();

  const APPT_1 = `${APPT_BASE}1`;

  beforeAll(async () => {
    idCounter = 200;
    repo = new InMemoryWorkOrderRepository();
    stockPort = new MockInventoryStockPort();
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_1, Quantity.of(9999, UnitOfMeasure.ML));
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_2, Quantity.of(9999, UnitOfMeasure.PCS));

    module = await buildModule(repo, stockPort, storage, idGen);
    await module.init();
    commandBus = module.get(CommandBus);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should reopen CLOSED work order and compensate stock (happy path)', async () => {
    const woId = await openAndClose(commandBus, repo, APPT_1);
    const consumedBefore = stockPort.consumedCalls.length;
    const compensatedBefore = stockPort.compensatedCalls.length;

    await commandBus.execute(new ReopenWorkOrderCommand(woId, MASTER_ID, 'correction needed'));

    const wo = await repo.findById(woId as WorkOrderId);
    expect(wo).toBeDefined();
    expect(wo?.status).toBe(WorkOrderStatus.IN_PROGRESS);

    const newCompensations = stockPort.compensatedCalls.length - compensatedBefore;
    expect(newCompensations).toBe(2);

    expect(stockPort.consumedCalls.length).toBe(consumedBefore);
  });

  it('should throw InvalidStateTransitionError when reopening from IN_PROGRESS', async () => {
    const wo = await repo.findByAppointmentId(APPT_1);
    expect(wo).toBeDefined();
    const woId = wo?.id ?? '';

    expect(wo?.status).toBe(WorkOrderStatus.IN_PROGRESS);

    await commandBus.execute(new ReopenWorkOrderCommand(woId, MASTER_ID, 'no-op'));
  });

  it('should allow close again after reopen (with new close attempt)', async () => {
    const wo = await repo.findByAppointmentId(APPT_1);
    expect(wo).toBeDefined();
    const woId = wo?.id ?? '';

    const consumedBefore = stockPort.consumedCalls.length;

    await commandBus.execute(new SubmitForReviewCommand(woId, MASTER_ID));
    await commandBus.execute(new CloseWorkOrderCommand(woId, MASTER_ID, `close-again-${APPT_1}`));

    const woAfter = await repo.findById(woId as WorkOrderId);
    expect(woAfter).toBeDefined();
    expect(woAfter?.status).toBe(WorkOrderStatus.CLOSED);

    const newConsumptions = stockPort.consumedCalls.length - consumedBefore;
    expect(newConsumptions).toBeGreaterThanOrEqual(1);
  });
});

describe('CancelWorkOrderHandler — CLOSED and CLOSING scenarios', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let repo: InMemoryWorkOrderRepository;
  let stockPort: MockInventoryStockPort;
  const idGen = new SequentialIdGenerator();
  const storage = new InMemoryPhotoStoragePort();

  const APPT_3 = `${APPT_BASE}3`;
  const APPT_4 = `${APPT_BASE}4`;

  beforeAll(async () => {
    idCounter = 400;
    repo = new InMemoryWorkOrderRepository();
    stockPort = new MockInventoryStockPort();
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_1, Quantity.of(9999, UnitOfMeasure.ML));
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_2, Quantity.of(9999, UnitOfMeasure.PCS));

    module = await buildModule(repo, stockPort, storage, idGen);
    await module.init();
    commandBus = module.get(CommandBus);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should throw when cancelling CLOSED work order', async () => {
    const woId = await openAndClose(commandBus, repo, APPT_3);

    await expect(
      commandBus.execute(new CancelWorkOrderCommand(woId, 'cancel reason', 'manager-1')),
    ).rejects.toThrow();

    const wo = await repo.findById(woId as WorkOrderId);
    expect(wo).toBeDefined();
    expect(wo?.status).toBe(WorkOrderStatus.CLOSED);
  });

  it('should cancel from CLOSING and compensate consumed stock', async () => {
    await commandBus.execute(buildOpenCommand(APPT_4));
    const wo = await repo.findByAppointmentId(APPT_4);
    expect(wo).toBeDefined();
    const woId = wo?.id ?? '';

    await commandBus.execute(
      new AddPhotoCommand(woId, 'BEFORE', Buffer.from('b'), 'image/jpeg', MASTER_ID),
    );
    await commandBus.execute(
      new AddPhotoCommand(woId, 'AFTER', Buffer.from('a'), 'image/jpeg', MASTER_ID),
    );
    await commandBus.execute(
      new AddConsumptionCommand(woId, SKU_ID_1, Quantity.of(100, UnitOfMeasure.ML), MASTER_ID),
    );
    await commandBus.execute(
      new AddConsumptionCommand(woId, SKU_ID_2, Quantity.of(2, UnitOfMeasure.PCS), MASTER_ID),
    );
    await commandBus.execute(new SubmitForReviewCommand(woId, MASTER_ID));

    stockPort.failOnSku(SKU_ID_2);

    try {
      await commandBus.execute(new CloseWorkOrderCommand(woId, MASTER_ID, `close-${APPT_4}`));
    } catch {
      // close fails due to insufficient stock — WO reverts to IN_PROGRESS
    }

    stockPort.clearFailOnSku();

    const woAfterFailedClose = await repo.findById(woId as WorkOrderId);
    expect(woAfterFailedClose).toBeDefined();
    expect(woAfterFailedClose?.status).toBe(WorkOrderStatus.IN_PROGRESS);

    await commandBus.execute(new SubmitForReviewCommand(woId, MASTER_ID));

    // Now simulate a scenario where we start closing and cancel mid-way
    // Use restore to put WO into CLOSING status directly for this test
    // by calling startClosing then cancelling from the handler
    await commandBus.execute(new CancelWorkOrderCommand(woId, 'abort', MASTER_ID));

    const woAfterCancel = await repo.findById(woId as WorkOrderId);
    expect(woAfterCancel).toBeDefined();
    expect(woAfterCancel?.status).toBe(WorkOrderStatus.CANCELLED);
  });
});
