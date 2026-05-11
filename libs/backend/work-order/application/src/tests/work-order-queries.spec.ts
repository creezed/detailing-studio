import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import { DateTime, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';
import { WorkOrderStatus } from '@det/backend-work-order-domain';

import { AddPhotoCommand } from '../commands/add-photo/add-photo.command';
import { OpenWorkOrderCommand } from '../commands/open-work-order/open-work-order.command';
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
import { GetClientWorkOrdersQuery } from '../queries/get-client-work-orders/get-client-work-orders.query';
import { GetCurrentStockForBranchQuery } from '../queries/get-current-stock/get-current-stock.query';
import { GetMyWorkOrdersQuery } from '../queries/get-my-work-orders/get-my-work-orders.query';
import { GetNormDeviationReportQuery } from '../queries/get-norm-deviation-report/get-norm-deviation-report.query';
import { GetWorkOrderByAppointmentQuery } from '../queries/get-work-order-by-appointment/get-work-order-by-appointment.query';
import { GetWorkOrderByIdQuery } from '../queries/get-work-order-by-id/get-work-order-by-id.query';
import { ListWorkOrdersQuery } from '../queries/list-work-orders/list-work-orders.query';
import { WorkOrderApplicationModule } from '../work-order-application.module';
import { InMemoryPhotoStoragePort } from './in-memory-photo-storage.port';
import { InMemoryWorkOrderRepository } from './in-memory-work-order.repository';

import type { CatalogSkuReadModel, ICatalogSkuPort } from '../ports/catalog-sku.port';
import type { CrmClientReadModel, ICrmClientPort } from '../ports/crm-client.port';
import type { CrmVehicleReadModel, ICrmVehiclePort } from '../ports/crm-vehicle.port';
import type { IIamUserPort, IamUserReadModel } from '../ports/iam-user.port';
import type { IInventoryStockPort } from '../ports/inventory-stock.port';
import type {
  ISchedulingAppointmentPort,
  SchedulingAppointmentReadModel,
} from '../ports/scheduling-appointment.port';
import type { IWorkOrderReadPort } from '../ports/work-order-read.port';
import type {
  CursorPaginatedResult,
  NormDeviationReportItem,
  WorkOrderDetailReadModel,
  WorkOrderListItemReadModel,
} from '../read-models/work-order.read-models';
import type { TestingModule } from '@nestjs/testing';

const NOW = DateTime.from('2024-06-15T10:00:00Z');
const WO_ID_1 = '11111111-1111-4111-a111-111111111111';
const LINE_ID_1 = '22222222-2222-4222-a222-222222222222';
const LINE_ID_2 = '22222222-2222-4222-a222-222222222223';
const PHOTO_ID_1 = '33333333-3333-4333-a333-333333333333';
const APPT_ID = 'aaaa0000-0000-4000-a000-000000000001';
const BRANCH_ID = 'bbbb0000-0000-4000-a000-000000000001';
const MASTER_ID = 'cccc0000-0000-4000-a000-000000000001';
const CLIENT_ID = 'dddd0000-0000-4000-a000-000000000001';
const VEHICLE_ID = 'eeee0000-0000-4000-a000-000000000001';
const SERVICE_ID = 'ffff0000-0000-4000-a000-000000000001';
const SKU_ID_1 = '00000000-0000-4000-a000-111000000001';
const SKU_ID_2 = '00000000-0000-4000-a000-111000000002';
const MISSING_WO_ID = '99999999-9999-4999-a999-999999999999';

class FixedClock implements IClock {
  now(): DateTime {
    return NOW;
  }
}

class QueueIdGenerator implements IIdGenerator {
  private _ids: string[] = [];
  generate(): string {
    const id = this._ids.shift();
    if (!id) throw new Error('QueueIdGenerator exhausted');
    return id;
  }
  reset(ids: readonly string[]): void {
    this._ids = [...ids];
  }
}

class InMemoryIamUserPort implements IIamUserPort {
  private readonly _users = new Map<string, IamUserReadModel>();

  seed(user: IamUserReadModel): void {
    this._users.set(user.id, user);
  }

  getById(userId: string): Promise<IamUserReadModel | null> {
    return Promise.resolve(this._users.get(userId) ?? null);
  }
}

class InMemoryCrmClientPort implements ICrmClientPort {
  private readonly _clients = new Map<string, CrmClientReadModel>();

  seed(client: CrmClientReadModel): void {
    this._clients.set(client.id, client);
  }

  getById(clientId: string): Promise<CrmClientReadModel | null> {
    return Promise.resolve(this._clients.get(clientId) ?? null);
  }
}

class InMemoryCrmVehiclePort implements ICrmVehiclePort {
  private readonly _vehicles = new Map<string, CrmVehicleReadModel>();

  seed(vehicle: CrmVehicleReadModel): void {
    this._vehicles.set(vehicle.id, vehicle);
  }

  getById(vehicleId: string): Promise<CrmVehicleReadModel | null> {
    return Promise.resolve(this._vehicles.get(vehicleId) ?? null);
  }
}

class InMemoryCatalogSkuPort implements ICatalogSkuPort {
  private readonly _skus = new Map<string, CatalogSkuReadModel>();

  seed(sku: CatalogSkuReadModel): void {
    this._skus.set(sku.id, sku);
  }

  getMany(skuIds: readonly string[]): Promise<readonly CatalogSkuReadModel[]> {
    return Promise.resolve(
      skuIds
        .map((id) => this._skus.get(id))
        .filter((s): s is CatalogSkuReadModel => s !== undefined),
    );
  }
}

class InMemorySchedulingAppointmentPort implements ISchedulingAppointmentPort {
  private readonly _appointments = new Map<string, SchedulingAppointmentReadModel>();

  seed(appt: SchedulingAppointmentReadModel): void {
    this._appointments.set(appt.id, appt);
  }

  getById(appointmentId: string): Promise<SchedulingAppointmentReadModel | null> {
    return Promise.resolve(this._appointments.get(appointmentId) ?? null);
  }

  listByMasterAndDay(): Promise<readonly SchedulingAppointmentReadModel[]> {
    return Promise.resolve([...this._appointments.values()]);
  }
}

class InMemoryInventoryStockPort implements IInventoryStockPort {
  private readonly _stock = new Map<string, Quantity>();

  seed(branchId: string, skuId: string, qty: Quantity): void {
    this._stock.set(`${branchId}:${skuId}`, qty);
  }

  getCurrentQuantity(branchId: string, skuId: string): Promise<Quantity | null> {
    return Promise.resolve(this._stock.get(`${branchId}:${skuId}`) ?? null);
  }
}

class InMemoryWorkOrderReadPort implements IWorkOrderReadPort {
  list(): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    return Promise.resolve({ items: [], nextCursor: null });
  }

  listClosedByClient(): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>> {
    return Promise.resolve({ items: [], nextCursor: null });
  }

  getNormDeviationReport(): Promise<readonly NormDeviationReportItem[]> {
    return Promise.resolve([]);
  }
}

function buildOpenCommand(): OpenWorkOrderCommand {
  return new OpenWorkOrderCommand(
    APPT_ID,
    BRANCH_ID,
    MASTER_ID,
    CLIENT_ID,
    VEHICLE_ID,
    [
      {
        serviceId: SERVICE_ID,
        serviceNameSnapshot: 'Полировка кузова',
        durationMinutes: 60,
        priceRubles: '5000',
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

describe('WorkOrder Queries', () => {
  let module: TestingModule;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let repo: InMemoryWorkOrderRepository;
  const storage = new InMemoryPhotoStoragePort();
  const idGen = new QueueIdGenerator();
  const iamUserPort = new InMemoryIamUserPort();
  const crmClientPort = new InMemoryCrmClientPort();
  const crmVehiclePort = new InMemoryCrmVehiclePort();
  const catalogSkuPort = new InMemoryCatalogSkuPort();
  const schedulingPort = new InMemorySchedulingAppointmentPort();
  const stockPort = new InMemoryInventoryStockPort();
  const readPort = new InMemoryWorkOrderReadPort();

  beforeAll(async () => {
    repo = new InMemoryWorkOrderRepository();

    iamUserPort.seed({ id: MASTER_ID, fullName: 'Иван Мастеров' });
    crmClientPort.seed({ id: CLIENT_ID, fullName: 'Пётр Клиентов', phone: '+7900***1234' });
    crmVehiclePort.seed({
      id: VEHICLE_ID,
      make: 'Toyota',
      model: 'Camry',
      licensePlate: 'A123BC77',
    });
    catalogSkuPort.seed({ id: SKU_ID_1, name: 'Полировальная паста', unit: 'ML' });
    catalogSkuPort.seed({ id: SKU_ID_2, name: 'Микрофибра', unit: 'PCS' });
    schedulingPort.seed({
      id: APPT_ID,
      slotStart: '2024-06-15T09:00:00Z',
      slotEnd: '2024-06-15T10:00:00Z',
      status: 'IN_PROGRESS',
    });
    stockPort.seed(BRANCH_ID, SKU_ID_1, Quantity.of(500, UnitOfMeasure.ML));

    module = await Test.createTestingModule({
      imports: [
        WorkOrderApplicationModule.register([
          { provide: WORK_ORDER_REPOSITORY, useValue: repo },
          { provide: WORK_ORDER_READ_PORT, useValue: readPort },
          { provide: PHOTO_STORAGE_PORT, useValue: storage },
          { provide: CLOCK, useValue: new FixedClock() },
          { provide: ID_GENERATOR, useValue: idGen },
          { provide: IAM_USER_PORT, useValue: iamUserPort },
          { provide: CRM_CLIENT_PORT, useValue: crmClientPort },
          { provide: CRM_VEHICLE_PORT, useValue: crmVehiclePort },
          { provide: CATALOG_SKU_PORT, useValue: catalogSkuPort },
          { provide: SCHEDULING_APPOINTMENT_PORT, useValue: schedulingPort },
          { provide: INVENTORY_STOCK_PORT, useValue: stockPort },
        ]),
      ],
    }).compile();
    await module.init();

    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);

    idGen.reset([LINE_ID_1, LINE_ID_2, WO_ID_1]);
    await commandBus.execute(buildOpenCommand());

    idGen.reset([PHOTO_ID_1]);
    await commandBus.execute(
      new AddPhotoCommand(WO_ID_1, 'BEFORE', Buffer.from('fake-jpeg'), 'image/jpeg', MASTER_ID),
    );
  });

  afterAll(async () => {
    await module.close();
  });

  describe('GetWorkOrderByIdQuery', () => {
    it('should return full detail read model', async () => {
      const result = await queryBus.execute<GetWorkOrderByIdQuery, WorkOrderDetailReadModel>(
        new GetWorkOrderByIdQuery(WO_ID_1),
      );

      expect(result.id).toBe(WO_ID_1);
      expect(result.appointmentId).toBe(APPT_ID);
      expect(result.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(result.master.fullName).toBe('Иван Мастеров');
      expect(result.client.fullName).toBe('Пётр Клиентов');
      expect(result.client.phone).toBe('+7900***1234');
      expect(result.vehicle.make).toBe('Toyota');
      expect(result.vehicle.licensePlate).toBe('A123BC77');
      expect(result.services).toHaveLength(1);
      expect(result.services[0]?.serviceName).toBe('Полировка кузова');
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0]?.skuName).toBe('Полировальная паста');
      expect(result.lines[1]?.skuName).toBe('Микрофибра');
      expect(result.photosBefore).toHaveLength(1);
    });

    it('should throw WorkOrderNotFoundError for missing id', async () => {
      await expect(queryBus.execute(new GetWorkOrderByIdQuery(MISSING_WO_ID))).rejects.toThrow(
        WorkOrderNotFoundError,
      );
    });
  });

  describe('GetWorkOrderByAppointmentQuery', () => {
    it('should return work order by appointment id', async () => {
      const result = await queryBus.execute<
        GetWorkOrderByAppointmentQuery,
        WorkOrderDetailReadModel | null
      >(new GetWorkOrderByAppointmentQuery(APPT_ID));

      expect(result).not.toBeNull();
      expect(result?.id).toBe(WO_ID_1);
    });

    it('should return null for unknown appointment', async () => {
      const result = await queryBus.execute<
        GetWorkOrderByAppointmentQuery,
        WorkOrderDetailReadModel | null
      >(new GetWorkOrderByAppointmentQuery(MISSING_WO_ID));

      expect(result).toBeNull();
    });
  });

  describe('ListWorkOrdersQuery', () => {
    it('should delegate to read port', async () => {
      const result = await queryBus.execute<
        ListWorkOrdersQuery,
        CursorPaginatedResult<WorkOrderListItemReadModel>
      >(new ListWorkOrdersQuery({ branchId: BRANCH_ID }));

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });
  });

  describe('GetMyWorkOrdersQuery', () => {
    it('should return work orders for master sorted by slotStart', async () => {
      const result = await queryBus.execute<GetMyWorkOrdersQuery, readonly unknown[]>(
        new GetMyWorkOrdersQuery(MASTER_ID, [WorkOrderStatus.IN_PROGRESS]),
      );

      expect(result).toHaveLength(1);
      expect((result[0] as Record<string, unknown>)['masterFullName']).toBe('Иван Мастеров');
      expect((result[0] as Record<string, unknown>)['slotStart']).toBe('2024-06-15T09:00:00Z');
    });

    it('should return empty for unknown master', async () => {
      const result = await queryBus.execute<GetMyWorkOrdersQuery, readonly unknown[]>(
        new GetMyWorkOrdersQuery(MISSING_WO_ID),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('GetClientWorkOrdersQuery', () => {
    it('should delegate to read port', async () => {
      const result = await queryBus.execute<
        GetClientWorkOrdersQuery,
        CursorPaginatedResult<WorkOrderListItemReadModel>
      >(new GetClientWorkOrdersQuery(CLIENT_ID));

      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
    });
  });

  describe('GetNormDeviationReportQuery', () => {
    it('should delegate to read port', async () => {
      const result = await queryBus.execute<
        GetNormDeviationReportQuery,
        readonly NormDeviationReportItem[]
      >(new GetNormDeviationReportQuery({ from: '2024-06-01', to: '2024-06-30' }, BRANCH_ID));

      expect(result).toEqual([]);
    });
  });

  describe('GetCurrentStockForBranchQuery', () => {
    it('should return stock quantities via inventory port', async () => {
      const result = await queryBus.execute<
        GetCurrentStockForBranchQuery,
        ReadonlyMap<string, Quantity | null>
      >(new GetCurrentStockForBranchQuery(BRANCH_ID, [SKU_ID_1, SKU_ID_2]));

      expect(result.get(SKU_ID_1)?.amount).toBe(500);
      expect(result.get(SKU_ID_2)).toBeNull();
    });
  });
});
