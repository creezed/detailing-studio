import { ExpiredCleanupCron } from './expired-cleanup.cron';

import type { EntityManager } from '@mikro-orm/postgresql';

describe('ExpiredCleanupCron', () => {
  let cron: ExpiredCleanupCron;
  let mockKnex: { raw: jest.Mock };
  let em: jest.Mocked<EntityManager>;

  beforeEach(() => {
    mockKnex = { raw: jest.fn() };
    em = { getKnex: () => mockKnex } as unknown as jest.Mocked<EntityManager>;
    cron = new ExpiredCleanupCron(em);
  });

  it('batch-updates expired notifications', async () => {
    mockKnex.raw.mockResolvedValue({ rowCount: 5 });

    await cron.handleExpiredNotifications();

    expect(mockKnex.raw).toHaveBeenCalledTimes(1);
    expect(mockKnex.raw).toHaveBeenCalledWith(expect.stringContaining('EXPIRED'), [1000]);
  });

  it('does nothing if no expired rows', async () => {
    mockKnex.raw.mockResolvedValue({ rowCount: 0 });

    await cron.handleExpiredNotifications();

    expect(mockKnex.raw).toHaveBeenCalledTimes(1);
  });
});
