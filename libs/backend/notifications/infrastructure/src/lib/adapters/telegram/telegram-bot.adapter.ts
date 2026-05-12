import { Inject, Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';

import { TELEGRAF_INSTANCE } from './telegram.tokens';

import type { ChannelSendResult, ITelegramSender } from '../../sender-ports';

@Injectable()
export class TelegramBotAdapter implements ITelegramSender {
  constructor(
    @Inject(TELEGRAF_INSTANCE)
    private readonly bot: Telegraf,
  ) {}

  async sendToChat(
    chatId: string,
    markdown: string,
    inlineKeyboard?: ReadonlyArray<
      ReadonlyArray<{ readonly text: string; readonly callback_data: string }>
    >,
  ): Promise<ChannelSendResult> {
    try {
      const result = await this.bot.telegram.sendMessage(chatId, markdown, {
        parse_mode: 'MarkdownV2',
        reply_markup: inlineKeyboard
          ? {
              inline_keyboard: inlineKeyboard.map((row) =>
                row.map((btn) => ({
                  text: btn.text,
                  callback_data: btn.callback_data,
                })),
              ),
            }
          : undefined,
      });

      return { ok: true, providerId: String(result.message_id) };
    } catch (error: unknown) {
      const { message, retryable } = mapTelegramError(error);

      return { ok: false, error: message, retryable };
    }
  }
}

function mapTelegramError(error: unknown): { message: string; retryable: boolean } {
  if (!(error instanceof Error)) {
    return { message: String(error), retryable: true };
  }

  const msg = error.message;

  if (msg.includes('403') || msg.includes('bot was blocked') || msg.includes('chat not found')) {
    return { message: msg, retryable: false };
  }

  if (msg.includes('429') || msg.includes('Too Many Requests')) {
    return { message: msg, retryable: true };
  }

  return { message: msg, retryable: true };
}
