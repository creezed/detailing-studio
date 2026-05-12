import { TelegramBotAdapter } from './telegram-bot.adapter';

function makeBotStub(sendMessageResult?: unknown, sendMessageError?: Error) {
  return {
    telegram: {
      sendMessage: jest.fn().mockImplementation(() => {
        if (sendMessageError) return Promise.reject(sendMessageError);

        return Promise.resolve(sendMessageResult ?? { message_id: 42 });
      }),
    },
  };
}

describe('TelegramBotAdapter', () => {
  it('returns ok on successful send', async () => {
    const bot = makeBotStub({ message_id: 42 });
    const adapter = new TelegramBotAdapter(bot as never);

    const result = await adapter.sendToChat('123456', 'Привет');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerId).toBe('42');
  });

  it('returns non-retryable error on 403 (bot blocked)', async () => {
    const bot = makeBotStub(undefined, new Error('403: bot was blocked by the user'));
    const adapter = new TelegramBotAdapter(bot as never);

    const result = await adapter.sendToChat('123456', 'Привет');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(false);
  });

  it('returns retryable error on 429 (rate limit)', async () => {
    const bot = makeBotStub(undefined, new Error('429: Too Many Requests'));
    const adapter = new TelegramBotAdapter(bot as never);

    const result = await adapter.sendToChat('123456', 'Привет');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });

  it('passes inline keyboard when provided', async () => {
    const bot = makeBotStub({ message_id: 99 });
    const adapter = new TelegramBotAdapter(bot as never);

    await adapter.sendToChat('123', 'msg', [[{ text: 'OK', callback_data: 'confirm:1' }]]);

    expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
      '123',
      'msg',
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [[{ text: 'OK', callback_data: 'confirm:1' }]],
        },
      }),
    );
  });
});
