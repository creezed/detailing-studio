/* eslint-disable @typescript-eslint/unbound-method */
import { QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import type { IClientRepository } from '@det/backend-crm-domain';
import { DateTime } from '@det/backend-shared-ddd';

import { CrmApplicationModule } from '../crm-application.module';
import {
  ANONYMIZATION_REQUEST_PORT,
  CLIENT_READ_PORT,
  CLIENT_REPOSITORY,
  CLOCK,
  CRM_CONFIG_PORT,
  FILE_STORAGE_PORT,
  ID_GENERATOR,
  PII_ACCESS_LOG_PORT,
  VISIT_HISTORY_READ_PORT,
  VISIT_HISTORY_WRITE_PORT,
} from '../di/tokens';
import { GetClientVisitHistoryQuery } from '../queries/get-client-visit-history/get-client-visit-history.query';

import type { IVisitHistoryReadPort, IVisitHistoryWritePort } from '../ports/visit-history.port';
import type { VisitHistoryItemReadModel } from '../read-models/visit-history.read-model';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const NOW = DateTime.from('2026-01-15T10:00:00.000Z');

const VISIT_1: VisitHistoryItemReadModel = {
  id: 'v1v1v1v1-v1v1-4v1v-8v1v-v1v1v1v1v1v1',
  clientId: CLIENT_ID,
  vehicleId: null,
  appointmentId: 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
  workOrderId: 'w1w1w1w1-w1w1-4w1w-8w1w-w1w1w1w1w1w1',
  branchId: 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1',
  masterId: 'm1m1m1m1-m1m1-4m1m-8m1m-m1m1m1m1m1m1',
  servicesSummary: [{ serviceId: 's1', name: 'Полировка', priceCents: 500000 }],
  scheduledAt: '2026-01-10T10:00:00.000Z',
  startedAt: '2026-01-10T10:05:00.000Z',
  completedAt: '2026-01-10T12:00:00.000Z',
  cancelledAt: null,
  status: 'COMPLETED',
  totalAmountCents: 500000,
  materialsTotalCents: 30000,
  photoCount: 2,
  beforePhotoUrls: ['https://s3/b1.jpg'],
  afterPhotoUrls: ['https://s3/a1.jpg'],
  updatedAt: '2026-01-10T12:00:00.000Z',
};

const VISIT_2: VisitHistoryItemReadModel = {
  id: 'v2v2v2v2-v2v2-4v2v-8v2v-v2v2v2v2v2v2',
  clientId: CLIENT_ID,
  vehicleId: null,
  appointmentId: 'a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2',
  workOrderId: null,
  branchId: 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1',
  masterId: 'm1m1m1m1-m1m1-4m1m-8m1m-m1m1m1m1m1m1',
  servicesSummary: [{ serviceId: 's2', name: 'Мойка', priceCents: 100000 }],
  scheduledAt: '2026-02-01T10:00:00.000Z',
  startedAt: null,
  completedAt: null,
  cancelledAt: null,
  status: 'SCHEDULED',
  totalAmountCents: null,
  materialsTotalCents: null,
  photoCount: 0,
  beforePhotoUrls: null,
  afterPhotoUrls: null,
  updatedAt: '2026-01-20T08:00:00.000Z',
};

function createMockClientRepo(): IClientRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByPhone: jest.fn().mockResolvedValue(null),
    findByVehicleVin: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation(() => Promise.resolve()),
  };
}

describe('GetClientVisitHistoryQuery', () => {
  let queryBus: QueryBus;
  let visitHistoryReadPort: IVisitHistoryReadPort;

  beforeEach(async () => {
    visitHistoryReadPort = {
      findByClientId: jest.fn().mockResolvedValue({
        items: [VISIT_2, VISIT_1],
        nextCursor: null,
      }),
      findByVehicleId: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      findAllByClientId: jest.fn().mockResolvedValue([VISIT_2, VISIT_1]),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        CrmApplicationModule.register([
          { provide: CLIENT_REPOSITORY, useValue: createMockClientRepo() },
          { provide: CLOCK, useValue: { now: () => NOW } },
          { provide: ID_GENERATOR, useValue: { generate: () => 'gen-id' } },
          {
            provide: CLIENT_READ_PORT,
            useValue: {
              list: jest.fn(),
              findById: jest.fn(),
              findByPhone: jest.fn(),
              findVehicles: jest.fn(),
            },
          },
          { provide: CRM_CONFIG_PORT, useValue: { getCurrentPolicyVersion: () => '1.0.0' } },
          {
            provide: ANONYMIZATION_REQUEST_PORT,
            useValue: {
              create: jest.fn(),
              findById: jest.fn(),
              findPendingByClientId: jest.fn(),
              markCompleted: jest.fn(),
              markCancelled: jest.fn(),
            },
          },
          {
            provide: FILE_STORAGE_PORT,
            useValue: {
              uploadJson: jest.fn(),
              getSignedUrl: jest.fn(),
            },
          },
          { provide: PII_ACCESS_LOG_PORT, useValue: { log: jest.fn() } },
          { provide: VISIT_HISTORY_READ_PORT, useValue: visitHistoryReadPort },
          {
            provide: VISIT_HISTORY_WRITE_PORT,
            useValue: {
              upsert: jest.fn(),
              updateByAppointmentId: jest.fn(),
              clearPhotosForClient: jest.fn(),
            } as IVisitHistoryWritePort,
          },
        ]),
      ],
    }).compile();

    await moduleRef.init();
    queryBus = moduleRef.get(QueryBus);
  });

  it('returns sorted visit history for a client', async () => {
    const result = await queryBus.execute(new GetClientVisitHistoryQuery(CLIENT_ID, 20));

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(VISIT_2);
    expect(result.items[1]).toEqual(VISIT_1);
    expect(result.nextCursor).toBeNull();
    expect(visitHistoryReadPort.findByClientId).toHaveBeenCalledWith(CLIENT_ID, 20, null);
  });

  it('passes cursor for pagination', async () => {
    const cursor = '2026-01-10T12:00:00.000Z';

    await queryBus.execute(new GetClientVisitHistoryQuery(CLIENT_ID, 10, cursor));

    expect(visitHistoryReadPort.findByClientId).toHaveBeenCalledWith(CLIENT_ID, 10, cursor);
  });

  it('returns empty list when no visits exist', async () => {
    (visitHistoryReadPort.findByClientId as jest.Mock).mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    });

    const result = await queryBus.execute(new GetClientVisitHistoryQuery(CLIENT_ID));

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});
