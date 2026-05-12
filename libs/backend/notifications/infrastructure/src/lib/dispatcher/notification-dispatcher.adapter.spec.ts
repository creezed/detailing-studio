import type { ITemplateRenderer } from '@det/backend-notifications-application';
import type { NotificationSnapshot, RecipientRef } from '@det/backend-notifications-domain';

import { NotificationDispatcherAdapter } from './notification-dispatcher.adapter';

import type { MjmlEmailRenderer } from '../rendering/mjml-email-renderer.adapter';
import type { IEmailSender, ISmsSender, ITelegramSender, IWebPushSender } from '../sender-ports';

function makeSnapshot(channel: string, recipient: RecipientRef): NotificationSnapshot {
  return {
    id: 'n-1',
    recipient,
    templateCode: 'APPOINTMENT_CONFIRMED',
    channel,
    payload: { branchName: 'Studio A' },
    status: 'SENDING',
    attempts: [],
    scheduledFor: null,
    dedupKey: null,
    createdAt: '2024-06-15T12:00:00Z',
    sentAt: null,
    failedAt: null,
    expiresAt: '2024-06-16T12:00:00Z',
  };
}

describe('NotificationDispatcherAdapter', () => {
  let dispatcher: NotificationDispatcherAdapter;
  let renderer: jest.Mocked<ITemplateRenderer>;
  let smsSender: jest.Mocked<ISmsSender>;
  let emailSender: jest.Mocked<IEmailSender>;
  let telegramSender: jest.Mocked<ITelegramSender>;
  let pushSender: jest.Mocked<IWebPushSender>;
  let mjmlRenderer: jest.Mocked<MjmlEmailRenderer>;

  beforeEach(() => {
    renderer = { render: jest.fn().mockResolvedValue('rendered text') };
    smsSender = { send: jest.fn().mockResolvedValue({ ok: true, providerId: 'sms-1' }) };
    emailSender = {
      send: jest.fn().mockResolvedValue({ ok: true, providerId: 'email-1' }),
    };
    telegramSender = {
      sendToChat: jest.fn().mockResolvedValue({ ok: true, providerId: 'tg-1' }),
    };
    pushSender = {
      send: jest.fn().mockResolvedValue({ ok: true, providerId: 'push-1' }),
    };
    mjmlRenderer = {
      render: jest.fn().mockResolvedValue({ html: '<p>hi</p>', text: 'hi' }),
    } as unknown as jest.Mocked<MjmlEmailRenderer>;

    dispatcher = new NotificationDispatcherAdapter(
      renderer,
      smsSender,
      mjmlRenderer,
      telegramSender,
      pushSender,
      emailSender,
    );
  });

  it('dispatches SMS to the correct sender', async () => {
    const result = await dispatcher.dispatch(
      makeSnapshot('SMS', { kind: 'phone', phone: '79001234567' }),
    );

    expect(result.ok).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(smsSender.send).toHaveBeenCalled();
  });

  it('dispatches EMAIL to the correct sender', async () => {
    const result = await dispatcher.dispatch(
      makeSnapshot('EMAIL', { kind: 'email', email: 'test@example.com' }),
    );

    expect(result.ok).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(emailSender.send).toHaveBeenCalled();
  });

  it('dispatches TELEGRAM to the correct sender', async () => {
    const result = await dispatcher.dispatch(
      makeSnapshot('TELEGRAM', { kind: 'telegramChat', chatId: 'chat-1' as never }),
    );

    expect(result.ok).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(telegramSender.sendToChat).toHaveBeenCalled();
  });

  it('returns error for SMS without phone recipient', async () => {
    const result = await dispatcher.dispatch(
      makeSnapshot('SMS', { kind: 'email', email: 'a@b.com' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('No phone');
  });

  it('returns error for unknown channel', async () => {
    const result = await dispatcher.dispatch(
      makeSnapshot('PIGEON', { kind: 'phone', phone: '123' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Unknown channel');
  });
});
