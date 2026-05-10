/* eslint-disable @typescript-eslint/unbound-method */
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import type { Client, IClientRepository } from '@det/backend-crm-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { RequestClientDataExportCommand } from '../commands/request-client-data-export/request-client-data-export.command';
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
} from '../di/tokens';
import { ClientNotFoundError, DataExportNotFoundError } from '../errors/application.errors';
import { GetClientDataExportQuery } from '../queries/get-client-data-export/get-client-data-export.query';

import type { IAnonymizationRequestPort } from '../ports/anonymization-request.port';
import type { IClientReadPort } from '../ports/client-read.port';
import type { IFileStoragePort } from '../ports/file-storage.port';
import type { IPiiAccessLogPort } from '../ports/pii-access-log.port';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const EXPORT_ID = '55555555-5555-4555-8555-555555555555';
const REQUESTER_ID = '44444444-4444-4444-8444-444444444444';
const NOW = DateTime.from('2026-01-15T10:00:00.000Z');

class QueueIdGenerator implements IIdGenerator {
  private readonly _queue: string[] = [];

  enqueue(...ids: string[]): void {
    this._queue.push(...ids);
  }

  generate(): string {
    const id = this._queue.shift();

    if (!id) {
      throw new Error('No more IDs in QueueIdGenerator');
    }

    return id;
  }
}

class FixedClock implements IClock {
  constructor(private readonly _now: DateTime) {}

  now(): DateTime {
    return this._now;
  }
}

function createMockClientRepo(): IClientRepository & { saved: Client[] } {
  const saved: Client[] = [];
  const saveFn = (client: Client): void => {
    saved.push(client);
  };

  return {
    saved,
    findById: jest.fn().mockResolvedValue(null),
    findByPhone: jest.fn().mockResolvedValue(null),
    findByVehicleVin: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation(saveFn),
  };
}

describe('Data Export', () => {
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let readPort: IClientReadPort;
  let fileStorage: IFileStoragePort;
  let idGen: QueueIdGenerator;

  beforeEach(async () => {
    readPort = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 }),
      findById: jest.fn().mockResolvedValue({
        id: CLIENT_ID,
        fullName: { last: 'Иванов', first: 'Иван', middle: null },
        phone: '+79990001111',
        email: null,
        birthDate: null,
        source: null,
        type: 'REGULAR',
        status: 'ACTIVE',
        comment: '',
        consents: [],
        vehicles: [],
        createdAt: NOW.iso(),
        anonymizedAt: null,
      }),
      findByPhone: jest.fn().mockResolvedValue(null),
      findVehicles: jest.fn().mockResolvedValue([]),
    };

    fileStorage = {
      uploadJson: jest.fn().mockResolvedValue({
        key: `data-exports/${CLIENT_ID}/${EXPORT_ID}.json`,
        signedUrl: 'https://storage.example.com/signed-url',
        expiresAt: '2026-01-22T10:00:00.000Z',
      }),
      getSignedUrl: jest.fn().mockResolvedValue(null),
    };

    idGen = new QueueIdGenerator();

    const moduleRef = await Test.createTestingModule({
      imports: [
        CrmApplicationModule.register([
          { provide: CLIENT_REPOSITORY, useValue: createMockClientRepo() },
          { provide: CLOCK, useValue: new FixedClock(NOW) },
          { provide: ID_GENERATOR, useValue: idGen },
          { provide: CLIENT_READ_PORT, useValue: readPort },
          {
            provide: CRM_CONFIG_PORT,
            useValue: { getCurrentPolicyVersion: () => '1.0.0' },
          },
          {
            provide: ANONYMIZATION_REQUEST_PORT,
            useValue: {
              create: jest.fn(),
              findById: jest.fn(),
              findPendingByClientId: jest.fn(),
              markCompleted: jest.fn(),
              markCancelled: jest.fn(),
            } as IAnonymizationRequestPort,
          },
          { provide: FILE_STORAGE_PORT, useValue: fileStorage },
          { provide: PII_ACCESS_LOG_PORT, useValue: { log: jest.fn() } as IPiiAccessLogPort },
        ]),
      ],
    }).compile();

    await moduleRef.init();
    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
  });

  describe('RequestClientDataExportCommand', () => {
    it('exports client data and returns signed URL', async () => {
      idGen.enqueue(EXPORT_ID);

      const result = await commandBus.execute(
        new RequestClientDataExportCommand(CLIENT_ID, REQUESTER_ID),
      );

      expect(result).toEqual({
        exportId: EXPORT_ID,
        signedUrl: 'https://storage.example.com/signed-url',
      });

      expect(fileStorage.uploadJson).toHaveBeenCalledTimes(1);
      expect(readPort.findById).toHaveBeenCalledWith(CLIENT_ID);
      expect(readPort.findVehicles).toHaveBeenCalledWith(CLIENT_ID);
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      (readPort.findById as jest.Mock).mockResolvedValueOnce(null);
      idGen.enqueue(EXPORT_ID);

      await expect(
        commandBus.execute(new RequestClientDataExportCommand(CLIENT_ID, REQUESTER_ID)),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('GetClientDataExportQuery', () => {
    it('returns signed URL for existing export', async () => {
      (fileStorage.getSignedUrl as jest.Mock).mockResolvedValueOnce(
        'https://storage.example.com/signed-url',
      );

      const result = await queryBus.execute(new GetClientDataExportQuery(CLIENT_ID, EXPORT_ID));

      expect(result).toEqual({ signedUrl: 'https://storage.example.com/signed-url' });
    });

    it('throws DataExportNotFoundError for missing/expired export', async () => {
      await expect(
        queryBus.execute(new GetClientDataExportQuery(CLIENT_ID, EXPORT_ID)),
      ).rejects.toThrow(DataExportNotFoundError);
    });
  });
});
