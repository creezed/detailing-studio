import * as webPush from 'web-push';

import { WebPushAdapter } from './web-push.adapter';

import type { ConfigService } from '@nestjs/config';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

function makeConfig(): ConfigService {
  const store: Record<string, string> = {
    VAPID_SUBJECT: 'mailto:test@studio.local',
    VAPID_PUBLIC_KEY: 'fake-public-key',
    VAPID_PRIVATE_KEY: 'fake-private-key',
  };

  return {
    get: (key: string, fallback?: string) => store[key] ?? fallback ?? '',
    getOrThrow: (key: string) => {
      const v = store[key];

      if (v === undefined) throw new Error(`Missing ${key}`);

      return v;
    },
  } as unknown as ConfigService;
}

const SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

describe('WebPushAdapter', () => {
  let adapter: WebPushAdapter;

  beforeEach(() => {
    (webPush.sendNotification as jest.Mock).mockReset();
    adapter = new WebPushAdapter(makeConfig());
  });

  it('returns ok on successful push', async () => {
    (webPush.sendNotification as jest.Mock).mockResolvedValue({ statusCode: 201 });

    const result = await adapter.send(SUBSCRIPTION, { title: 'Test', body: 'Hello' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerId).toBe('push-201');
  });

  it('returns non-retryable error on 410 Gone (expired)', async () => {
    const error = new Error('410 Gone') as Error & { statusCode: number };

    error.statusCode = 410;
    (webPush.sendNotification as jest.Mock).mockRejectedValue(error);

    const result = await adapter.send(SUBSCRIPTION, { title: 'Test', body: 'Hello' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(false);
      expect(result.error).toContain('expired');
    }
  });

  it('returns retryable error on 429 rate limit', async () => {
    const error = new Error('429 Too Many') as Error & { statusCode: number };

    error.statusCode = 429;
    (webPush.sendNotification as jest.Mock).mockRejectedValue(error);

    const result = await adapter.send(SUBSCRIPTION, { title: 'Test', body: 'Hello' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });
});
