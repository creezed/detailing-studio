import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';

import type {
  ChannelSendResult,
  IWebPushSender,
  PushPayload,
  PushSubscriptionDto,
} from '../../sender-ports';

@Injectable()
export class WebPushAdapter implements IWebPushSender {
  constructor(config: ConfigService) {
    const vapidSubject = config.getOrThrow<string>('VAPID_SUBJECT');
    const vapidPublic = config.getOrThrow<string>('VAPID_PUBLIC_KEY');
    const vapidPrivate = config.getOrThrow<string>('VAPID_PRIVATE_KEY');

    webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  }

  async send(subscription: PushSubscriptionDto, payload: PushPayload): Promise<ChannelSendResult> {
    try {
      const result = await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        },
        JSON.stringify(payload),
      );

      return { ok: true, providerId: `push-${String(result.statusCode)}` };
    } catch (error: unknown) {
      const { message, retryable } = mapWebPushError(error);

      return { ok: false, error: message, retryable };
    }
  }
}

function mapWebPushError(error: unknown): { message: string; retryable: boolean } {
  if (!(error instanceof Error)) {
    return { message: String(error), retryable: true };
  }

  const msg = error.message;
  const statusCode = (error as { statusCode?: number }).statusCode;

  if (statusCode === 410 || statusCode === 404) {
    return { message: `Push subscription expired (${String(statusCode)})`, retryable: false };
  }

  if (statusCode === 429) {
    return { message: 'Push rate limit', retryable: true };
  }

  if (statusCode && statusCode >= 500) {
    return { message: msg, retryable: true };
  }

  return { message: msg, retryable: true };
}
