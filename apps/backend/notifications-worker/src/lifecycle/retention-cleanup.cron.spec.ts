import { RetentionCleanupCron } from './retention-cleanup.cron';

import type { EntityManager } from '@mikro-orm/postgresql';

describe('RetentionCleanupCron', () => {
  let cron: RetentionCleanupCron;
  let mockKnex: { raw: jest.Mock };
  let em: jest.Mocked<EntityManager>;

  beforeEach(() => {
    mockKnex = { raw: jest.fn() };
    em = { getKnex: () => mockKnex } as unknown as jest.Mocked<EntityManager>;
    cron = new RetentionCleanupCron(em);
  });

  it('deletes old terminal-state notifications', async () => {
    mockKnex.raw.mockResolvedValue({ rowCount: 42 });

    await cron.handleRetentionCleanup();

    expect(mockKnex.raw).toHaveBeenCalledTimes(1);
    const sql = mockKnex.raw.mock.calls[0]?.[0] as string;

    expect(sql).toContain('DELETE FROM ntf_notification');
    expect(sql).toContain('90 days');
  });

  it('does nothing if no old rows', async () => {
    mockKnex.raw.mockResolvedValue({ rowCount: 0 });

    await cron.handleRetentionCleanup();

    expect(mockKnex.raw).toHaveBeenCalledTimes(1);
  });
});
