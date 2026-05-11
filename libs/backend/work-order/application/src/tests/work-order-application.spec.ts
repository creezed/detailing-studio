import { CommandBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrderStatus } from '@det/backend-work-order-domain';

import { AddConsumptionCommand } from '../commands/add-consumption/add-consumption.command';
import { AddPhotoCommand } from '../commands/add-photo/add-photo.command';
import { CancelWorkOrderCommand } from '../commands/cancel-work-order/cancel-work-order.command';
import { OpenWorkOrderCommand } from '../commands/open-work-order/open-work-order.command';
import { RemoveConsumptionLineCommand } from '../commands/remove-consumption-line/remove-consumption-line.command';
import { RemovePhotoCommand } from '../commands/remove-photo/remove-photo.command';
import { ReturnToInProgressCommand } from '../commands/return-to-in-progress/return-to-in-progress.command';
import { SubmitForReviewCommand } from '../commands/submit-for-review/submit-for-review.command';
import { UpdateConsumptionLineCommand } from '../commands/update-consumption-line/update-consumption-line.command';
import {
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
import { WorkOrderNotFoundError } from '../errors/application.errors';
import { WorkOrderApplicationModule } from '../work-order-application.module';
import { InMemoryPhotoStoragePort } from './in-memory-photo-storage.port';
import { InMemoryWorkOrderRepository } from './in-memory-work-order.repository';

import type { TestingModule } from '@nestjs/testing';

const NOW = DateTime.from('2024-06-15T10:00:00Z');
const WO_ID_1 = '11111111-1111-4111-a111-111111111111';
const LINE_ID_1 = '22222222-2222-4222-a222-222222222222';
const PHOTO_ID_1 = '33333333-3333-4333-a333-333333333333';
const PHOTO_ID_X = '33333333-3333-4333-a333-333333333334';
const LINE_ID_EXTRA = '44444444-4444-4444-a444-444444444444';
const MISSING_ID = '99999999-9999-4999-a999-999999999999';
const APPT_ID = 'aaaa0000-0000-4000-a000-000000000001';

class FixedClock implements IClock {
  now(): DateTime {
    return NOW;
  }
}

class QueueIdGenerator implements IIdGenerator {
  private _ids: string[] = [];

  reset(ids: readonly string[]): void {
    this._ids = [...ids];
  }

  generate(): string {
    const id = this._ids.shift();
    if (!id) {
      throw new Error('No test id available');
    }
    return id;
  }
}

function buildOpenCommand(): OpenWorkOrderCommand {
  return new OpenWorkOrderCommand(
    APPT_ID,
    'branch-1',
    'master-1',
    'client-1',
    'vehicle-1',
    [
      {
        durationMinutes: 60,
        priceRubles: '1500.00',
        serviceId: 'svc-1',
        serviceNameSnapshot: 'Полировка',
      },
    ],
    [
      {
        normAmount: Quantity.of(100, UnitOfMeasure.ML),
        skuId: 'sku-1',
        skuNameSnapshot: 'Полировальная паста',
      },
    ],
    NOW,
  );
}

describe('WorkOrder Application', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let repo: InMemoryWorkOrderRepository;
  let storage: InMemoryPhotoStoragePort;
  let idGen: QueueIdGenerator;

  beforeAll(async () => {
    repo = new InMemoryWorkOrderRepository();
    storage = new InMemoryPhotoStoragePort();
    idGen = new QueueIdGenerator();

    module = await Test.createTestingModule({
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
          {
            provide: INVENTORY_STOCK_PORT,
            useValue: { getCurrentQuantity: () => Promise.resolve(null) },
          },
        ]),
      ],
    }).compile();
    await module.init();

    commandBus = module.get(CommandBus);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('OpenWorkOrder', () => {
    it('should create a work order and return id', async () => {
      idGen.reset([LINE_ID_1, WO_ID_1]);

      const id = await commandBus.execute<OpenWorkOrderCommand, string>(buildOpenCommand());

      expect(id).toBe(WO_ID_1);
      expect(repo.size).toBe(1);

      const wo = await repo.findById(id as never);
      expect(wo).not.toBeNull();
      expect(wo?.status).toBe(WorkOrderStatus.OPEN);
    });

    it('should be idempotent — return existing id for same appointment', async () => {
      const id = await commandBus.execute<OpenWorkOrderCommand, string>(buildOpenCommand());

      expect(id).toBe(WO_ID_1);
      expect(repo.size).toBe(1);
    });
  });

  describe('AddPhoto', () => {
    it('should add a before photo', async () => {
      idGen.reset([PHOTO_ID_1]);

      const photoId = await commandBus.execute<AddPhotoCommand, string>(
        new AddPhotoCommand(WO_ID_1, 'BEFORE', Buffer.from('fake-jpeg'), 'image/jpeg', 'user-1'),
      );

      expect(photoId).toBe(PHOTO_ID_1);
      expect(storage.uploadCount).toBe(1);

      const wo = await repo.findById(WO_ID_1 as never);
      expect(wo?.toSnapshot().photosBefore).toHaveLength(1);
    });

    it('should throw WorkOrderNotFoundError for missing wo', async () => {
      idGen.reset([PHOTO_ID_X]);

      await expect(
        commandBus.execute(
          new AddPhotoCommand(MISSING_ID, 'BEFORE', Buffer.from('x'), 'image/jpeg', 'u'),
        ),
      ).rejects.toThrow(WorkOrderNotFoundError);
    });
  });

  describe('RemovePhoto', () => {
    it('should remove a photo', async () => {
      await commandBus.execute(new RemovePhotoCommand(WO_ID_1, PHOTO_ID_1, 'user-1'));

      const wo = await repo.findById(WO_ID_1 as never);
      expect(wo?.toSnapshot().photosBefore).toHaveLength(0);
    });
  });

  describe('AddConsumption', () => {
    it('should add consumption for existing line (updates draft)', async () => {
      await commandBus.execute(
        new AddConsumptionCommand(WO_ID_1, 'sku-1', Quantity.of(95, UnitOfMeasure.ML), 'master-1'),
      );

      const wo = await repo.findById(WO_ID_1 as never);
      const line = wo?.toSnapshot().lines.find((l) => l.skuId === 'sku-1');
      expect(line?.actualAmount).toBe(95);
    });
  });

  describe('UpdateConsumptionLine', () => {
    it('should update a consumption line', async () => {
      const wo = await repo.findById(WO_ID_1 as never);
      const lines = wo?.toSnapshot().lines ?? [];
      expect(lines.length).toBeGreaterThan(0);
      const lineId = lines[0]?.id ?? '';

      await commandBus.execute(
        new UpdateConsumptionLineCommand(
          WO_ID_1,
          lineId,
          Quantity.of(110, UnitOfMeasure.ML),
          'master-1',
          'пролил',
        ),
      );

      const updated = await repo.findById(WO_ID_1 as never);
      const updatedLine = updated?.toSnapshot().lines.find((l) => l.id === lineId);
      expect(updatedLine?.actualAmount).toBe(110);
      expect(updatedLine?.deviationReason).toBe('пролил');
    });
  });

  describe('RemoveConsumptionLine', () => {
    it('should remove a consumption line', async () => {
      idGen.reset([LINE_ID_EXTRA]);

      await commandBus.execute(
        new AddConsumptionCommand(
          WO_ID_1,
          'sku-extra',
          Quantity.of(50, UnitOfMeasure.ML),
          'master-1',
        ),
      );

      const wo = await repo.findById(WO_ID_1 as never);
      const extraLine = wo?.toSnapshot().lines.find((l) => l.skuId === 'sku-extra');
      expect(extraLine).toBeDefined();
      const extraLineId = extraLine?.id ?? '';

      await commandBus.execute(new RemoveConsumptionLineCommand(WO_ID_1, extraLineId, 'master-1'));

      const after = await repo.findById(WO_ID_1 as never);
      expect(after?.toSnapshot().lines.find((l) => l.skuId === 'sku-extra')).toBeUndefined();
    });
  });

  describe('SubmitForReview', () => {
    it('should transition to AWAITING_REVIEW', async () => {
      await commandBus.execute(new SubmitForReviewCommand(WO_ID_1, 'master-1'));

      const wo = await repo.findById(WO_ID_1 as never);
      expect(wo?.status).toBe(WorkOrderStatus.AWAITING_REVIEW);
    });
  });

  describe('ReturnToInProgress', () => {
    it('should transition back to IN_PROGRESS', async () => {
      await commandBus.execute(
        new ReturnToInProgressCommand(WO_ID_1, 'manager-1', 'фото нечёткое'),
      );

      const wo = await repo.findById(WO_ID_1 as never);
      expect(wo?.status).toBe(WorkOrderStatus.IN_PROGRESS);
    });
  });

  describe('CancelWorkOrder', () => {
    it('should cancel the work order', async () => {
      await commandBus.execute(
        new CancelWorkOrderCommand(WO_ID_1, 'клиент не приехал', 'manager-1'),
      );

      const wo = await repo.findById(WO_ID_1 as never);
      expect(wo?.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('should throw WorkOrderNotFoundError for missing id', async () => {
      await expect(
        commandBus.execute(new CancelWorkOrderCommand(MISSING_ID, 'reason', 'user')),
      ).rejects.toThrow(WorkOrderNotFoundError);
    });
  });
});
