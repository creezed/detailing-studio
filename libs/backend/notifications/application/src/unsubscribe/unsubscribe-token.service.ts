import { createHmac } from 'node:crypto';

import type { NotificationChannel } from '@det/backend-notifications-domain';
import type { UserId } from '@det/shared-types';

interface UnsubscribePayload {
  readonly uid: string;
  readonly ch: string;
  readonly iat: number;
}

export interface UnsubscribeTokenResult {
  readonly userId: UserId;
  readonly channel: NotificationChannel;
}

function toBase64Url(data: string): string {
  return Buffer.from(data, 'utf8').toString('base64url');
}

function fromBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function generateUnsubscribeToken(
  userId: UserId,
  channel: NotificationChannel,
  secret: string,
  nowMs: number = Date.now(),
): string {
  const payload: UnsubscribePayload = {
    uid: userId,
    ch: channel,
    iat: nowMs,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = sign(encoded, secret);

  return `${encoded}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): UnsubscribeTokenResult | null {
  const dotIndex = token.indexOf('.');

  if (dotIndex === -1) {
    return null;
  }

  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expectedSig = sign(encoded, secret);

  if (sig !== expectedSig) {
    return null;
  }

  try {
    const raw = fromBase64Url(encoded);
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null || !('uid' in parsed) || !('ch' in parsed)) {
      return null;
    }

    const p = parsed as UnsubscribePayload;

    return {
      userId: p.uid as UserId,
      channel: p.ch as NotificationChannel,
    };
  } catch {
    return null;
  }
}
