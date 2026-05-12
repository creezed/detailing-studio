import { SmtpAdapter } from './smtp.adapter';

import type { ConfigService } from '@nestjs/config';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

function makeConfig(): ConfigService {
  const store: Record<string, string | number | boolean> = {
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'noreply@studio.local',
  };

  return {
    get: (key: string, fallback?: unknown) => store[key] ?? fallback,
    getOrThrow: (key: string) => {
      const v = store[key];

      if (v === undefined) throw new Error(`Missing ${key}`);

      return v;
    },
  } as unknown as ConfigService;
}

describe('SmtpAdapter', () => {
  let adapter: SmtpAdapter;
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer') as { createTransport: jest.Mock };

    sendMailMock = jest.fn();
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

    adapter = new SmtpAdapter(makeConfig());
  });

  it('returns ok on successful send', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'msg-001' });

    const result = await adapter.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerId).toBe('msg-001');
  });

  it('returns retryable error on connection failure', async () => {
    sendMailMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await adapter.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });
});
