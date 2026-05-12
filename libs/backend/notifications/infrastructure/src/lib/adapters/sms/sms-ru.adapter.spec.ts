import { SmsRuAdapter } from './sms-ru.adapter';

import type { ConfigService } from '@nestjs/config';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const store: Record<string, string> = {
    SMS_RU_API_KEY: 'test-api-key',
    SMS_RU_SENDER: '',
    SMS_RU_BASE_URL: 'http://localhost:19999',
    ...overrides,
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

describe('SmsRuAdapter', () => {
  let adapter: SmsRuAdapter;
  let fetchSpy: jest.SpyInstance | undefined;

  beforeEach(() => {
    adapter = new SmsRuAdapter(makeConfig());
  });

  afterEach(() => {
    if (fetchSpy) fetchSpy.mockRestore();
  });

  it('returns ok on success (status_code=100)', async () => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'OK',
          status_code: 100,
          sms: { '79001234567': { status: 'OK', status_code: 100, sms_id: 'sms-123' } },
        }),
        { status: 200 },
      ),
    );

    const result = await adapter.send('79001234567', 'test');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerId).toBe('sms-123');
  });

  it('returns retryable error on rate limit (429)', async () => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }));

    const result = await adapter.send('79001234567', 'test');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });

  it('returns non-retryable error on invalid phone (status_code=202)', async () => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ERROR', status_code: 202, sms: {} }), {
        status: 200,
      }),
    );

    const result = await adapter.send('invalid', 'test');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(false);
  });

  it('returns retryable error on network failure', async () => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await adapter.send('79001234567', 'test');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });
});
