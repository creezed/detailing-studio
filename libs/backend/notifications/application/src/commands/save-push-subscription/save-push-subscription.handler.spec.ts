import { DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import { SavePushSubscriptionCommand } from './save-push-subscription.command';
import { SavePushSubscriptionHandler } from './save-push-subscription.handler';

import type {
  IPushSubscriptionRepository,
  PushSubscriptionRecord,
} from '../../ports/push-subscription.port';

const USER_ID = 'u-1' as UserId;
const NOW = DateTime.from('2024-06-15T12:00:00Z');
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123';
const KEYS = { p256dh: 'p256dh-key', auth: 'auth-key' };

describe('SavePushSubscriptionHandler', () => {
  let handler: SavePushSubscriptionHandler;
  let repo: jest.Mocked<IPushSubscriptionRepository>;
  let idGen: { generate: jest.Mock };

  beforeEach(() => {
    repo = {
      findByEndpoint: jest.fn(),
      // eslint-disable-next-line unicorn/no-useless-undefined
      save: jest.fn<Promise<void>, [PushSubscriptionRecord]>().mockResolvedValue(undefined),
      deleteById: jest.fn(),
    };

    idGen = { generate: jest.fn().mockReturnValue('new-id-1') };

    handler = new SavePushSubscriptionHandler(repo, idGen);
  });

  it('creates new subscription when endpoint is new', async () => {
    repo.findByEndpoint.mockResolvedValue(null);

    await handler.execute(
      new SavePushSubscriptionCommand(USER_ID, ENDPOINT, KEYS, 'Chrome/120', NOW),
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-id-1',
        userId: USER_ID,
        endpoint: ENDPOINT,
        keys: KEYS,
        userAgent: 'Chrome/120',
        createdAt: NOW.iso(),
      }),
    );
  });

  it('upserts existing subscription by endpoint (preserves id and createdAt)', async () => {
    const existing: PushSubscriptionRecord = {
      id: 'existing-id',
      userId: USER_ID,
      endpoint: ENDPOINT,
      keys: { p256dh: 'old', auth: 'old' },
      userAgent: 'Firefox/100',
      createdAt: '2024-01-01T00:00:00Z',
    };
    repo.findByEndpoint.mockResolvedValue(existing);

    await handler.execute(
      new SavePushSubscriptionCommand(USER_ID, ENDPOINT, KEYS, 'Chrome/120', NOW),
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-id',
        createdAt: '2024-01-01T00:00:00Z',
        keys: KEYS,
        userAgent: 'Chrome/120',
      }),
    );
  });

  it('does not generate a new ID when upserting', async () => {
    const existing: PushSubscriptionRecord = {
      id: 'existing-id',
      userId: USER_ID,
      endpoint: ENDPOINT,
      keys: KEYS,
      userAgent: null,
      createdAt: '2024-01-01T00:00:00Z',
    };
    repo.findByEndpoint.mockResolvedValue(existing);

    await handler.execute(new SavePushSubscriptionCommand(USER_ID, ENDPOINT, KEYS, null, NOW));

    expect(idGen.generate).not.toHaveBeenCalled();
  });
});
