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
import { CloseWorkOrderCommand } from '../commands/close-work-order/close-work-order.command';
import { OpenWorkOrderCommand } from '../commands/open-work-order/open-work-order.command';
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
import {
  InsufficientStockForCloseError,
  WorkOrderNotFoundError,
} from '../errors/application.errors';
import { WorkOrderApplicationModule } from '../work-order-application.module';

import type {
  CompensateStockInput,
  ConsumeStockInput,
  ConsumeStockResult,
  IInventoryStockPort,
} from '../ports/inventory-stock.port';
import type { TestingModule } from '@nestjs/testing';

const NOW = DateTime.from('2024-06-15T10:00:00Z');
const APPT_ID = '00000000-0000-4000-a000-aaa000000001';
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

let idCounter = 0;

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

function buildOpenCommand(appointmentId: string): OpenWorkOrderCommand {
  return new OpenWorkOrderCommand(
    appointmentId,
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

describe('CloseWorkOrderHandler', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let repo: InMemoryWorkOrderRepository;
  let stockPort: MockInventoryStockPort;
  const idGen = new SequentialIdGenerator();
  const storage = new InMemoryPhotoStoragePort();

  beforeAll(async () => {
    idCounter = 0;
    repo = new InMemoryWorkOrderRepository();
    stockPort = new MockInventoryStockPort();
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_1, Quantity.of(500, UnitOfMeasure.ML));
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_2, Quantity.of(10, UnitOfMeasure.PCS));

    module = await buildModule(repo, stockPort, storage, idGen);
    await module.init();
    commandBus = module.get(CommandBus);
  });

  afterAll(async () => {
    await module.close();
  });

  async function createClosableWo(apptId: string): Promise<string> {
    await commandBus.execute(buildOpenCommand(apptId));
    const wo = await repo.findByAppointmentId(apptId);
    expect(wo).toBeDefined();
    const woId = wo?.id ?? '';

    await commandBus.execute(
      new AddPhotoCommand(woId, 'BEFORE', Buffer.from('photo-before'), 'image/jpeg', MASTER_ID),
    );
    await commandBus.execute(
      new AddPhotoCommand(woId, 'AFTER', Buffer.from('photo-after'), 'image/jpeg', MASTER_ID),
    );
    await commandBus.execute(
      new AddConsumptionCommand(woId, SKU_ID_1, Quantity.of(100, UnitOfMeasure.ML), MASTER_ID),
    );
    await commandBus.execute(
      new AddConsumptionCommand(woId, SKU_ID_2, Quantity.of(2, UnitOfMeasure.PCS), MASTER_ID),
    );
    await commandBus.execute(new SubmitForReviewCommand(woId, MASTER_ID));

    return woId;
  }

  it('should close work order with stock consumption (happy path)', async () => {
    const woId = await createClosableWo(APPT_ID);

    await commandBus.execute(new CloseWorkOrderCommand(woId, MASTER_ID, 'close-key-1'));

    const wo = await repo.findById(woId as WorkOrderId);
    expect(wo).toBeDefined();
    expect(wo?.status).toBe(WorkOrderStatus.CLOSED);
    expect(stockPort.consumedCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should be idempotent for already CLOSED work order', async () => {
    const wo = await repo.findByAppointmentId(APPT_ID);
    expect(wo).toBeDefined();
    const woId = wo?.id ?? '';
    const consumedBefore = stockPort.consumedCalls.length;

    await commandBus.execute(new CloseWorkOrderCommand(woId, MASTER_ID, 'close-key-1'));

    expect(stockPort.consumedCalls.length).toBe(consumedBefore);
    expect(wo?.status).toBe(WorkOrderStatus.CLOSED);
  });

  it('should throw WorkOrderNotFoundError for unknown id', async () => {
    await expect(
      commandBus.execute(
        new CloseWorkOrderCommand('00000000-0000-4000-a000-999999999999', MASTER_ID, 'key'),
      ),
    ).rejects.toThrow(WorkOrderNotFoundError);
  });
});

describe('CloseWorkOrderHandler — insufficient stock with compensation', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let repo: InMemoryWorkOrderRepository;
  let stockPort: MockInventoryStockPort;
  const idGen = new SequentialIdGenerator();
  const storage = new InMemoryPhotoStoragePort();

  const APPT_ID_2 = '00000000-0000-4000-a000-aaa000000002';

  beforeAll(async () => {
    idCounter = 100;
    repo = new InMemoryWorkOrderRepository();
    stockPort = new MockInventoryStockPort();
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_1, Quantity.of(500, UnitOfMeasure.ML));
    stockPort.seedAvailable(BRANCH_ID, SKU_ID_2, Quantity.of(10, UnitOfMeasure.PCS));

    module = await buildModule(repo, stockPort, storage, idGen);
    await module.init();
    commandBus = module.get(CommandBus);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should compensate consumed lines and revert to IN_PROGRESS on failure', async () => {
    await commandBus.execute(buildOpenCommand(APPT_ID_2));
    const wo = await repo.findByAppointmentId(APPT_ID_2);
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

    await expect(
      commandBus.execute(new CloseWorkOrderCommand(woId, MASTER_ID, 'close-key-fail')),
    ).rejects.toThrow(InsufficientStockForCloseError);

    const woAfter = await repo.findById(woId as WorkOrderId);
    expect(woAfter).toBeDefined();
    expect(woAfter?.status).toBe(WorkOrderStatus.IN_PROGRESS);

    expect(stockPort.compensatedCalls.length).toBeGreaterThanOrEqual(1);
  });
});
