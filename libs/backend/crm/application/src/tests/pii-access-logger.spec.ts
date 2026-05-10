/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';

import { PiiAccessLogger } from '../audit/pii-access-logger.service';
import { PII_ACCESS_LOG_PORT } from '../di/tokens';

import type { IPiiAccessLogPort, PiiAccessLogEntry } from '../ports/pii-access-log.port';

describe('PiiAccessLogger', () => {
  let logger: PiiAccessLogger;
  let logPort: IPiiAccessLogPort;
  let logged: PiiAccessLogEntry[];

  beforeEach(async () => {
    logged = [];
    logPort = {
      log: jest.fn().mockImplementation((entry: PiiAccessLogEntry) => {
        logged.push(entry);

        return Promise.resolve();
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PiiAccessLogger, { provide: PII_ACCESS_LOG_PORT, useValue: logPort }],
    }).compile();

    logger = moduleRef.get(PiiAccessLogger);
  });

  const ctx = {
    actorUserId: 'actor-1',
    clientId: 'client-1',
    ip: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
  };

  it('logs VIEW operation', async () => {
    await logger.logView(ctx);

    expect(logPort.log).toHaveBeenCalledTimes(1);
    expect(logged[0]?.operation).toBe('VIEW');
    expect(logged[0]?.actorUserId).toBe('actor-1');
    expect(logged[0]?.clientId).toBe('client-1');
    expect(logged[0]?.fields).toEqual([]);
  });

  it('logs UPDATE operation with fields', async () => {
    await logger.logUpdate(ctx, ['fullName', 'phone']);

    expect(logged[0]?.operation).toBe('UPDATE');
    expect(logged[0]?.fields).toEqual(['fullName', 'phone']);
  });

  it('logs EXPORT operation', async () => {
    await logger.logExport(ctx);

    expect(logged[0]?.operation).toBe('EXPORT');
  });

  it('logs DELETE operation for anonymization', async () => {
    await logger.logAnonymize(ctx);

    expect(logged[0]?.operation).toBe('DELETE');
  });

  it('passes IP and user-agent', async () => {
    await logger.logView(ctx);

    expect(logged[0]?.ip).toBe('127.0.0.1');
    expect(logged[0]?.userAgent).toBe('TestAgent/1.0');
  });

  it('handles null IP and user-agent', async () => {
    await logger.logView({ ...ctx, ip: null, userAgent: null });

    expect(logged[0]?.ip).toBeNull();
    expect(logged[0]?.userAgent).toBeNull();
  });
});
