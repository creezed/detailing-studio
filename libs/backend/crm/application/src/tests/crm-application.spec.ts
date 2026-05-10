/* eslint-disable @typescript-eslint/unbound-method */
import { CommandBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import type { Client, IClientRepository } from '@det/backend-crm-domain';
import {
  ClientAlreadyRegularError,
  ClientType,
  ConsentType,
  MissingMandatoryConsentError,
  VehicleAlreadyDeactivatedError,
  VehicleNotFoundError,
} from '@det/backend-crm-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { AddVehicleCommand } from '../commands/add-vehicle/add-vehicle.command';
import { DeactivateVehicleCommand } from '../commands/deactivate-vehicle/deactivate-vehicle.command';
import { RegisterGuestClientCommand } from '../commands/register-guest-client/register-guest-client.command';
import { RegisterRegularClientCommand } from '../commands/register-regular-client/register-regular-client.command';
import { UpdateClientProfileCommand } from '../commands/update-client-profile/update-client-profile.command';
import { UpdateVehicleCommand } from '../commands/update-vehicle/update-vehicle.command';
import { UpgradeClientToRegularCommand } from '../commands/upgrade-client-to-regular/upgrade-client-to-regular.command';
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
import { ClientNotFoundError, DuplicatePhoneError } from '../errors/application.errors';

import type { IAnonymizationRequestPort } from '../ports/anonymization-request.port';
import type { IClientReadPort } from '../ports/client-read.port';
import type { ICrmConfigPort } from '../ports/config.port';
import type { IFileStoragePort } from '../ports/file-storage.port';
import type { IPiiAccessLogPort } from '../ports/pii-access-log.port';
import type { IVisitHistoryReadPort, IVisitHistoryWritePort } from '../ports/visit-history.port';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '22222222-2222-4222-8222-222222222222';
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

function savedAt(repo: { saved: Client[] }, index: number): Client {
  const c = repo.saved[index];

  if (!c) {
    throw new Error(`No saved client at index ${String(index)}`);
  }

  return c;
}

function createMockClientRepo(): IClientRepository & {
  saved: Client[];
} {
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

function createMockReadPort(): IClientReadPort {
  return {
    list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 }),
    findById: jest.fn().mockResolvedValue(null),
    findByPhone: jest.fn().mockResolvedValue(null),
    findVehicles: jest.fn().mockResolvedValue([]),
  };
}

function createMockConfigPort(): ICrmConfigPort {
  return { getCurrentPolicyVersion: () => '1.0.0' };
}

function createMockAnonPort(): IAnonymizationRequestPort {
  return {
    create: jest.fn().mockImplementation(() => Promise.resolve()),
    findById: jest.fn().mockResolvedValue(null),
    findPendingByClientId: jest.fn().mockResolvedValue(null),
    markCompleted: jest.fn().mockImplementation(() => Promise.resolve()),
    markCancelled: jest.fn().mockImplementation(() => Promise.resolve()),
  };
}

function createMockFileStorage(): IFileStoragePort {
  return {
    uploadJson: jest.fn().mockResolvedValue({ key: 'k', signedUrl: 'https://url', expiresAt: '' }),
    getSignedUrl: jest.fn().mockResolvedValue(null),
  };
}

function createMockPiiLog(): IPiiAccessLogPort {
  return { log: jest.fn().mockImplementation(() => Promise.resolve()) };
}

describe('CRM Application Commands', () => {
  let commandBus: CommandBus;
  let clientRepo: ReturnType<typeof createMockClientRepo>;
  let idGen: QueueIdGenerator;

  beforeEach(async () => {
    clientRepo = createMockClientRepo();
    idGen = new QueueIdGenerator();

    const moduleRef = await Test.createTestingModule({
      imports: [
        CrmApplicationModule.register([
          { provide: CLIENT_REPOSITORY, useValue: clientRepo },
          { provide: CLOCK, useValue: new FixedClock(NOW) },
          { provide: ID_GENERATOR, useValue: idGen },
          { provide: CLIENT_READ_PORT, useValue: createMockReadPort() },
          { provide: CRM_CONFIG_PORT, useValue: createMockConfigPort() },
          { provide: ANONYMIZATION_REQUEST_PORT, useValue: createMockAnonPort() },
          { provide: FILE_STORAGE_PORT, useValue: createMockFileStorage() },
          { provide: PII_ACCESS_LOG_PORT, useValue: createMockPiiLog() },
          {
            provide: VISIT_HISTORY_READ_PORT,
            useValue: {
              findByClientId: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
              findByVehicleId: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
              findAllByClientId: jest.fn().mockResolvedValue([]),
            } as IVisitHistoryReadPort,
          },
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
    commandBus = moduleRef.get(CommandBus);
  });

  describe('RegisterRegularClientCommand', () => {
    it('registers a regular client and returns id', async () => {
      idGen.enqueue(CLIENT_ID);

      const result = await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          'Иванович',
          '+79990001111',
          'ivan@example.com',
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      expect(result).toEqual({ id: CLIENT_ID });
      expect(clientRepo.save).toHaveBeenCalledTimes(1);

      const saved = savedAt(clientRepo, 0);
      expect(saved.toSnapshot().type).toBe(ClientType.REGULAR);
    });

    it('throws DuplicatePhoneError when phone already exists', async () => {
      idGen.enqueue(CLIENT_ID);
      (clientRepo.findByPhone as jest.Mock).mockResolvedValueOnce({ id: 'existing' });

      await expect(
        commandBus.execute(
          new RegisterRegularClientCommand(
            'Иванов',
            'Иван',
            null,
            '+79990001111',
            null,
            null,
            null,
            '',
            [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
          ),
        ),
      ).rejects.toThrow(DuplicatePhoneError);
    });

    it('throws MissingMandatoryConsentError without PERSONAL_DATA_PROCESSING', async () => {
      idGen.enqueue(CLIENT_ID);

      await expect(
        commandBus.execute(
          new RegisterRegularClientCommand(
            'Иванов',
            'Иван',
            null,
            '+79990001111',
            null,
            null,
            null,
            '',
            [],
          ),
        ),
      ).rejects.toThrow(MissingMandatoryConsentError);
    });
  });

  describe('RegisterGuestClientCommand', () => {
    it('registers a guest client and returns id', async () => {
      idGen.enqueue(CLIENT_ID);

      const result = await commandBus.execute(
        new RegisterGuestClientCommand(
          'Петров',
          'Пётр',
          null,
          '+79990002222',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      expect(result).toEqual({ id: CLIENT_ID });

      const saved = savedAt(clientRepo, 0);
      expect(saved.toSnapshot().type).toBe(ClientType.GUEST);
    });

    it('throws DuplicatePhoneError when phone already exists', async () => {
      idGen.enqueue(CLIENT_ID);
      (clientRepo.findByPhone as jest.Mock).mockResolvedValueOnce({ id: 'existing' });

      await expect(
        commandBus.execute(
          new RegisterGuestClientCommand(
            'Петров',
            'Пётр',
            null,
            '+79990002222',
            null,
            null,
            null,
            '',
            [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
          ),
        ),
      ).rejects.toThrow(DuplicatePhoneError);
    });
  });

  describe('UpgradeClientToRegularCommand', () => {
    it('upgrades GUEST to REGULAR', async () => {
      idGen.enqueue(CLIENT_ID);
      const guestResult = await commandBus.execute(
        new RegisterGuestClientCommand(
          'Сидоров',
          'Сидор',
          null,
          '+79990003333',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const savedGuest = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(savedGuest);

      await commandBus.execute(new UpgradeClientToRegularCommand(guestResult.id));

      expect(clientRepo.save).toHaveBeenCalledTimes(2);
      expect(savedAt(clientRepo, 1).toSnapshot().type).toBe(ClientType.REGULAR);
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      await expect(
        commandBus.execute(new UpgradeClientToRegularCommand(CLIENT_ID)),
      ).rejects.toThrow(ClientNotFoundError);
    });

    it('throws ClientAlreadyRegularError for REGULAR client', async () => {
      idGen.enqueue(CLIENT_ID);
      await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          null,
          '+79990004444',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const savedRegular = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(savedRegular);

      await expect(
        commandBus.execute(new UpgradeClientToRegularCommand(CLIENT_ID)),
      ).rejects.toThrow(ClientAlreadyRegularError);
    });
  });

  describe('UpdateClientProfileCommand', () => {
    it('updates profile fields', async () => {
      idGen.enqueue(CLIENT_ID);
      await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          null,
          '+79990005555',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(
        new UpdateClientProfileCommand(
          CLIENT_ID,
          'Петров',
          'Пётр',
          null,
          undefined,
          'new@example.com',
        ),
      );

      expect(clientRepo.save).toHaveBeenCalledTimes(2);
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      await expect(
        commandBus.execute(new UpdateClientProfileCommand(CLIENT_ID, 'A', 'B')),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('AddVehicleCommand', () => {
    it('adds a vehicle and returns vehicleId', async () => {
      idGen.enqueue(CLIENT_ID);
      await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          null,
          '+79990006666',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);
      idGen.enqueue(VEHICLE_ID);

      const result = await commandBus.execute(
        new AddVehicleCommand(CLIENT_ID, 'BMW', 'X5', 'SUV', null, null, 2023, null, ''),
      );

      expect(result).toEqual({ vehicleId: VEHICLE_ID });
      expect(clientRepo.save).toHaveBeenCalledTimes(2);
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      idGen.enqueue(VEHICLE_ID);

      await expect(
        commandBus.execute(
          new AddVehicleCommand(CLIENT_ID, 'BMW', 'X5', 'SUV', null, null, null, null, ''),
        ),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('UpdateVehicleCommand', () => {
    it('updates vehicle attributes', async () => {
      idGen.enqueue(CLIENT_ID);
      await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          null,
          '+79990007777',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const saved2 = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved2);
      idGen.enqueue(VEHICLE_ID);

      await commandBus.execute(
        new AddVehicleCommand(CLIENT_ID, 'BMW', 'X5', 'SUV', null, null, 2023, null, ''),
      );

      const withVehicle = savedAt(clientRepo, 1);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(withVehicle);

      await commandBus.execute(new UpdateVehicleCommand(CLIENT_ID, VEHICLE_ID, undefined, 'X3'));

      expect(clientRepo.save).toHaveBeenCalledTimes(3);
    });

    it('throws VehicleNotFoundError for unknown vehicle', async () => {
      idGen.enqueue(CLIENT_ID);
      await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          null,
          '+79990008888',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await expect(
        commandBus.execute(new UpdateVehicleCommand(CLIENT_ID, VEHICLE_ID, undefined, 'X3')),
      ).rejects.toThrow(VehicleNotFoundError);
    });
  });

  describe('DeactivateVehicleCommand', () => {
    it('deactivates a vehicle', async () => {
      idGen.enqueue(CLIENT_ID);
      await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          null,
          '+79990009999',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const saved3 = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved3);
      idGen.enqueue(VEHICLE_ID);

      await commandBus.execute(
        new AddVehicleCommand(CLIENT_ID, 'BMW', 'X5', 'SUV', null, null, 2023, null, ''),
      );

      const withVehicle = savedAt(clientRepo, 1);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(withVehicle);

      await commandBus.execute(new DeactivateVehicleCommand(CLIENT_ID, VEHICLE_ID));

      expect(clientRepo.save).toHaveBeenCalledTimes(3);

      const final = savedAt(clientRepo, 2);
      expect(final.toSnapshot().vehicles[0]?.isActive).toBe(false);
    });

    it('throws VehicleAlreadyDeactivatedError on double deactivation', async () => {
      idGen.enqueue(CLIENT_ID);
      await commandBus.execute(
        new RegisterRegularClientCommand(
          'Иванов',
          'Иван',
          null,
          '+79990011111',
          null,
          null,
          null,
          '',
          [{ type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' }],
        ),
      );

      const saved4 = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved4);
      idGen.enqueue(VEHICLE_ID);

      await commandBus.execute(
        new AddVehicleCommand(CLIENT_ID, 'BMW', 'X5', 'SUV', null, null, null, null, ''),
      );

      const withVehicle = savedAt(clientRepo, 1);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(withVehicle);
      await commandBus.execute(new DeactivateVehicleCommand(CLIENT_ID, VEHICLE_ID));

      const deactivated = savedAt(clientRepo, 2);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(deactivated);

      await expect(
        commandBus.execute(new DeactivateVehicleCommand(CLIENT_ID, VEHICLE_ID)),
      ).rejects.toThrow(VehicleAlreadyDeactivatedError);
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      await expect(
        commandBus.execute(new DeactivateVehicleCommand(CLIENT_ID, VEHICLE_ID)),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });
});
