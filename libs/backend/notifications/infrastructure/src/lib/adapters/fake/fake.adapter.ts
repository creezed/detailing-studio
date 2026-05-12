import { Injectable } from '@nestjs/common';

import type {
  ChannelSendResult,
  EmailPayload,
  IEmailSender,
  ISmsSender,
  ITelegramSender,
  IWebPushSender,
  PushPayload,
  PushSubscriptionDto,
} from '../../sender-ports';

export interface FakeSentNotification {
  readonly channel: 'SMS' | 'EMAIL' | 'TELEGRAM' | 'PUSH';
  readonly to: string;
  readonly payload: unknown;
  readonly sentAt: Date;
}

@Injectable()
export class FakeNotificationAdapter
  implements ISmsSender, IEmailSender, ITelegramSender, IWebPushSender
{
  readonly sent: FakeSentNotification[] = [];

  send(
    ...args: [string, string] | [PushSubscriptionDto, PushPayload] | [EmailPayload]
  ): Promise<ChannelSendResult> {
    if (args.length === 2 && typeof args[0] === 'string') {
      this.sent.push({
        channel: 'SMS',
        to: args[0],
        payload: args[1],
        sentAt: new Date(),
      });
    } else if (args.length === 1) {
      const ep = args[0];

      this.sent.push({
        channel: 'EMAIL',
        to: ep.to,
        payload: ep,
        sentAt: new Date(),
      });
    } else {
      const sub = args[0] as PushSubscriptionDto;

      this.sent.push({
        channel: 'PUSH',
        to: sub.endpoint,
        payload: args[1],
        sentAt: new Date(),
      });
    }

    return Promise.resolve({ ok: true as const, providerId: `fake-${String(Date.now())}` });
  }

  sendToChat(chatId: string, markdown: string): Promise<ChannelSendResult> {
    this.sent.push({
      channel: 'TELEGRAM',
      to: chatId,
      payload: markdown,
      sentAt: new Date(),
    });

    return Promise.resolve({ ok: true as const, providerId: `fake-tg-${String(Date.now())}` });
  }

  clear(): void {
    this.sent.length = 0;
  }
}
