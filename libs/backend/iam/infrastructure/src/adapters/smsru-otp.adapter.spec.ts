import { SmsruOtpAdapter } from './smsru-otp.adapter';
import { SmsruApiError, SmsruDeliveryError } from './smsru-otp.errors';

import type { SmsruSendResponse } from './smsru-otp.types';
import type { ConfigService } from '@nestjs/config';

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const defaults: Record<string, unknown> = {
    'sms.sender': '',
    'sms.smsRuApiKey': 'TEST-API-KEY',
    'sms.testMode': false,
    ...overrides,
  };

  return { get: (key: string) => defaults[key] } as unknown as ConfigService;
}

function okResponse(phone: string, smsId = '000-100'): SmsruSendResponse {
  return {
    balance: 100,
    sms: {
      [phone]: { sms_id: smsId, status: 'OK', status_code: 100 },
    },
    status: 'OK',
    status_code: 100,
  };
}

describe('SmsruOtpAdapter', () => {
  const PHONE = '79991234567';
  const CODE = '123456';

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should throw SmsruApiError when api key is empty', async () => {
    const adapter = new SmsruOtpAdapter(makeConfig({ 'sms.smsRuApiKey': '' }));

    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(SmsruApiError);
    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(/not configured/);
  });

  it('should POST to sms.ru/sms/send with correct params', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(okResponse(PHONE)),
      ok: true,
    });
    globalThis.fetch = fetchMock;

    const adapter = new SmsruOtpAdapter(
      makeConfig({ 'sms.sender': 'Studio', 'sms.testMode': true }),
    );

    await adapter.send(PHONE, CODE);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://sms.ru/sms/send');
    expect(options.method).toBe('POST');

    const body = new URLSearchParams(options.body as string);
    expect(body.get('api_id')).toBe('TEST-API-KEY');
    expect(body.get('to')).toBe(PHONE);
    expect(body.get('msg')).toBe(CODE);
    expect(body.get('json')).toBe('1');
    expect(body.get('from')).toBe('Studio');
    expect(body.get('test')).toBe('1');
  });

  it('should not include "from" when sender is empty', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(okResponse(PHONE)),
      ok: true,
    });

    const adapter = new SmsruOtpAdapter(makeConfig({ 'sms.sender': '' }));
    await adapter.send(PHONE, CODE);

    const body = new URLSearchParams(
      (globalThis.fetch as jest.Mock).mock.calls[0][1].body as string,
    );
    expect(body.has('from')).toBe(false);
  });

  it('should not include "test" when testMode is false', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(okResponse(PHONE)),
      ok: true,
    });

    const adapter = new SmsruOtpAdapter(makeConfig({ 'sms.testMode': false }));
    await adapter.send(PHONE, CODE);

    const body = new URLSearchParams(
      (globalThis.fetch as jest.Mock).mock.calls[0][1].body as string,
    );
    expect(body.has('test')).toBe(false);
  });

  it('should throw SmsruApiError on HTTP error', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const adapter = new SmsruOtpAdapter(makeConfig());

    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(SmsruApiError);
    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(/HTTP 503/);
  });

  it('should throw SmsruApiError when top-level status is ERROR', async () => {
    const errorResponse: SmsruSendResponse = {
      status: 'ERROR',
      status_code: 301,
      status_text: 'Wrong api_id',
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(errorResponse),
      ok: true,
    });

    const adapter = new SmsruOtpAdapter(makeConfig());

    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(SmsruApiError);
    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(/301/);
  });

  it('should throw SmsruApiError when phone not found in response', async () => {
    const response: SmsruSendResponse = {
      balance: 100,
      sms: {},
      status: 'OK',
      status_code: 100,
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(response),
      ok: true,
    });

    const adapter = new SmsruOtpAdapter(makeConfig());

    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(SmsruApiError);
    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(/No result for phone/);
  });

  it('should throw SmsruDeliveryError when sms status is ERROR', async () => {
    const response: SmsruSendResponse = {
      balance: 100,
      sms: {
        [PHONE]: {
          status: 'ERROR',
          status_code: 207,
          status_text: 'No route for this number',
        },
      },
      status: 'OK',
      status_code: 100,
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(response),
      ok: true,
    });

    const adapter = new SmsruOtpAdapter(makeConfig());

    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(SmsruDeliveryError);
    await expect(adapter.send(PHONE, CODE)).rejects.toThrow(/207/);
  });
});
