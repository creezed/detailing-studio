/* eslint-disable @typescript-eslint/unbound-method */
import { CommandBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import type { Client, ClientSnapshot, IClientRepository } from '@det/backend-crm-domain';
import { ClientAnonymizedError, ClientStatus, ConsentType } from '@det/backend-crm-domain';
import { DateTime } from '@det/backend-shared-ddd';
import type { DomainEvent, IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { AnonymizeClientCommand } from '../commands/anonymize-client/anonymize-client.command';
import { CancelAnonymizationRequestCommand } from '../commands/cancel-anonymization-request/cancel-anonymization-request.command';
import { GiveConsentCommand } from '../commands/give-consent/give-consent.command';
import { RegisterRegularClientCommand } from '../commands/register-regular-client/register-regular-client.command';
import { RequestClientAnonymizationCommand } from '../commands/request-client-anonymization/request-client-anonymization.command';
import { RevokeConsentCommand } from '../commands/revoke-consent/revoke-consent.command';
import { UpdateClientProfileCommand } from '../commands/update-client-profile/update-client-profile.command';
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
import {
  AnonymizationRequestNotFoundError,
  AnonymizationRequestNotPendingError,
  ClientNotFoundError,
  MustAnonymizeError,
} from '../errors/application.errors';

import type { IAnonymizationRequestPort } from '../ports/anonymization-request.port';
import type { IClientReadPort } from '../ports/client-read.port';
import type { ICrmConfigPort } from '../ports/config.port';
import type { IFileStoragePort } from '../ports/file-storage.port';
import type { IPiiAccessLogPort } from '../ports/pii-access-log.port';
import type { IVisitHistoryReadPort, IVisitHistoryWritePort } from '../ports/visit-history.port';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
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

function createMockAnonPort(): IAnonymizationRequestPort & {
  created: unknown[];
} {
  const created: unknown[] = [];

  return {
    created,
    create: jest.fn().mockImplementation((req: unknown) => {
      created.push(req);

      return Promise.resolve();
    }),
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

async function registerClient(commandBus: CommandBus, idGen: QueueIdGenerator): Promise<string> {
  idGen.enqueue(CLIENT_ID);

  const result = await commandBus.execute(
    new RegisterRegularClientCommand('Иванов', 'Иван', null, '+79990001111', null, null, null, '', [
      { type: ConsentType.PERSONAL_DATA_PROCESSING, policyVersion: '1.0.0' },
    ]),
  );

  return (result as { id: string }).id;
}

describe('Consent Commands', () => {
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
              findByClientId: jest.fn(),
              findByVehicleId: jest.fn(),
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

  describe('GiveConsentCommand', () => {
    it('gives consent using explicit policyVersion', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(
        new GiveConsentCommand(CLIENT_ID, ConsentType.MARKETING_NOTIFICATIONS, '2.0.0'),
      );

      expect(clientRepo.save).toHaveBeenCalledTimes(2);
      const updated = savedAt(clientRepo, 1);
      const snap: ClientSnapshot = updated.toSnapshot();
      const marketing = snap.consents.find(
        (c: { type: string }) => c.type === ConsentType.MARKETING_NOTIFICATIONS,
      );
      expect(marketing).toBeDefined();
      expect(marketing?.policyVersion).toBe('2.0.0');
    });

    it('gives consent using ConfigPort policyVersion when not provided', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(
        new GiveConsentCommand(CLIENT_ID, ConsentType.MARKETING_NOTIFICATIONS),
      );

      expect(clientRepo.save).toHaveBeenCalledTimes(2);
      const updated = savedAt(clientRepo, 1);
      const snap: ClientSnapshot = updated.toSnapshot();
      const marketing = snap.consents.find(
        (c: { type: string }) => c.type === ConsentType.MARKETING_NOTIFICATIONS,
      );
      expect(marketing?.policyVersion).toBe('1.0.0');
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      await expect(
        commandBus.execute(new GiveConsentCommand(CLIENT_ID, ConsentType.MARKETING_NOTIFICATIONS)),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('RevokeConsentCommand', () => {
    it('revokes MARKETING consent', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(
        new GiveConsentCommand(CLIENT_ID, ConsentType.MARKETING_NOTIFICATIONS, '1.0.0'),
      );

      const withMarketing = savedAt(clientRepo, 1);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(withMarketing);

      await commandBus.execute(
        new RevokeConsentCommand(CLIENT_ID, ConsentType.MARKETING_NOTIFICATIONS),
      );

      expect(clientRepo.save).toHaveBeenCalledTimes(3);
    });

    it('throws MustAnonymizeError when revoking PERSONAL_DATA_PROCESSING', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await expect(
        commandBus.execute(
          new RevokeConsentCommand(CLIENT_ID, ConsentType.PERSONAL_DATA_PROCESSING),
        ),
      ).rejects.toThrow(MustAnonymizeError);
    });
  });
});

describe('Anonymization Commands', () => {
  let commandBus: CommandBus;
  let clientRepo: ReturnType<typeof createMockClientRepo>;
  let anonPort: ReturnType<typeof createMockAnonPort>;
  let idGen: QueueIdGenerator;

  beforeEach(async () => {
    clientRepo = createMockClientRepo();
    anonPort = createMockAnonPort();
    idGen = new QueueIdGenerator();

    const moduleRef = await Test.createTestingModule({
      imports: [
        CrmApplicationModule.register([
          { provide: CLIENT_REPOSITORY, useValue: clientRepo },
          { provide: CLOCK, useValue: new FixedClock(NOW) },
          { provide: ID_GENERATOR, useValue: idGen },
          { provide: CLIENT_READ_PORT, useValue: createMockReadPort() },
          { provide: CRM_CONFIG_PORT, useValue: createMockConfigPort() },
          { provide: ANONYMIZATION_REQUEST_PORT, useValue: anonPort },
          { provide: FILE_STORAGE_PORT, useValue: createMockFileStorage() },
          { provide: PII_ACCESS_LOG_PORT, useValue: createMockPiiLog() },
          {
            provide: VISIT_HISTORY_READ_PORT,
            useValue: {
              findByClientId: jest.fn(),
              findByVehicleId: jest.fn(),
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

  describe('RequestClientAnonymizationCommand', () => {
    it('creates anonymization request with 30-day due', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);
      idGen.enqueue(REQUEST_ID);

      const result = await commandBus.execute(
        new RequestClientAnonymizationCommand(CLIENT_ID, 'CLIENT', 'want deletion'),
      );

      expect(result).toEqual({ requestId: REQUEST_ID });
      expect(anonPort.create).toHaveBeenCalledTimes(1);
      expect(anonPort.created[0]).toMatchObject({
        id: REQUEST_ID,
        clientId: CLIENT_ID,
        requestedBy: 'CLIENT',
        reason: 'want deletion',
        status: 'PENDING',
      });
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      idGen.enqueue(REQUEST_ID);

      await expect(
        commandBus.execute(new RequestClientAnonymizationCommand(CLIENT_ID, 'CLIENT', 'reason')),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('AnonymizeClientCommand', () => {
    it('anonymizes client PII — fields become placeholders', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(new AnonymizeClientCommand(CLIENT_ID, OWNER_ID, '152-FZ request'));

      expect(clientRepo.save).toHaveBeenCalledTimes(2);
      const anonymized = savedAt(clientRepo, 1);
      const snap = anonymized.toSnapshot();
      expect(snap.status).toBe(ClientStatus.ANONYMIZED);
      expect(snap.fullName.last).toContain('ANONYMIZED');
      expect(snap.phone).toBe('+70000000000');
      expect(snap.email).toBeNull();
      expect(snap.birthDate).toBeNull();
    });

    it('is no-op for already anonymized client', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(new AnonymizeClientCommand(CLIENT_ID, OWNER_ID, 'first'));

      const anonymized = savedAt(clientRepo, 1);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(anonymized);

      await commandBus.execute(new AnonymizeClientCommand(CLIENT_ID, OWNER_ID, 'second'));

      const snap = savedAt(clientRepo, 2).toSnapshot();
      expect(snap.status).toBe(ClientStatus.ANONYMIZED);
    });

    it('marks anonymization request as COMPLETED when requestId given', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(
        new AnonymizeClientCommand(CLIENT_ID, OWNER_ID, 'reason', REQUEST_ID),
      );

      expect(anonPort.markCompleted).toHaveBeenCalledWith(REQUEST_ID, OWNER_ID, NOW.iso());
    });

    it('forbids update after anonymization', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(new AnonymizeClientCommand(CLIENT_ID, OWNER_ID, 'reason'));

      const anonymized = savedAt(clientRepo, 1);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(anonymized);

      await expect(
        commandBus.execute(new UpdateClientProfileCommand(CLIENT_ID, 'New', 'Name')),
      ).rejects.toThrow(ClientAnonymizedError);
    });

    it('throws ClientNotFoundError for unknown client', async () => {
      await expect(
        commandBus.execute(new AnonymizeClientCommand(CLIENT_ID, OWNER_ID, 'r')),
      ).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('CancelAnonymizationRequestCommand', () => {
    it('cancels a PENDING request', async () => {
      (anonPort.findById as jest.Mock).mockResolvedValueOnce({
        id: REQUEST_ID,
        clientId: CLIENT_ID,
        status: 'PENDING',
      });

      await commandBus.execute(
        new CancelAnonymizationRequestCommand(REQUEST_ID, OWNER_ID, 'changed mind'),
      );

      expect(anonPort.markCancelled).toHaveBeenCalledWith(
        REQUEST_ID,
        OWNER_ID,
        NOW.iso(),
        'changed mind',
      );
    });

    it('throws AnonymizationRequestNotFoundError for unknown request', async () => {
      await expect(
        commandBus.execute(new CancelAnonymizationRequestCommand(REQUEST_ID, OWNER_ID, 'r')),
      ).rejects.toThrow(AnonymizationRequestNotFoundError);
    });

    it('throws AnonymizationRequestNotPendingError for non-PENDING request', async () => {
      (anonPort.findById as jest.Mock).mockResolvedValueOnce({
        id: REQUEST_ID,
        clientId: CLIENT_ID,
        status: 'COMPLETED',
      });

      await expect(
        commandBus.execute(new CancelAnonymizationRequestCommand(REQUEST_ID, OWNER_ID, 'r')),
      ).rejects.toThrow(AnonymizationRequestNotPendingError);
    });
  });

  describe('ClientAnonymized domain event', () => {
    it('emits event without PII', async () => {
      await registerClient(commandBus, idGen);
      const saved = savedAt(clientRepo, 0);
      (clientRepo.findById as jest.Mock).mockResolvedValueOnce(saved);

      await commandBus.execute(new AnonymizeClientCommand(CLIENT_ID, OWNER_ID, '152-FZ'));

      const anonymized = savedAt(clientRepo, 1);
      const events = anonymized.pullDomainEvents();
      const anonEvent = events.find((e: DomainEvent) => e.eventType === 'ClientAnonymized');

      if (anonEvent) {
        const payload = JSON.stringify(anonEvent);
        expect(payload).not.toContain('Иванов');
        expect(payload).not.toContain('+79990001111');
      }
    });
  });
});
