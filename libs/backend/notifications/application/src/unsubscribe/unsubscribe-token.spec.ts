import { NotificationChannel } from '@det/backend-notifications-domain';
import type { UserId } from '@det/shared-types';

import { generateUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token.service';

const SECRET = 'test-secret-32-bytes-long-value!';
const USER_ID = 'u-1' as UserId;

describe('UnsubscribeTokenService', () => {
  it('generate → verify round-trip', () => {
    const token = generateUnsubscribeToken(USER_ID, NotificationChannel.EMAIL, SECRET);

    const result = verifyUnsubscribeToken(token, SECRET);

    expect(result).toEqual({
      userId: USER_ID,
      channel: NotificationChannel.EMAIL,
    });
  });

  it('returns null for invalid signature', () => {
    const token = generateUnsubscribeToken(USER_ID, NotificationChannel.SMS, SECRET);
    const tampered = token.slice(0, -4) + 'XXXX';

    expect(verifyUnsubscribeToken(tampered, SECRET)).toBeNull();
  });

  it('returns null for wrong secret', () => {
    const token = generateUnsubscribeToken(USER_ID, NotificationChannel.EMAIL, SECRET);

    expect(verifyUnsubscribeToken(token, 'wrong-secret')).toBeNull();
  });

  it('returns null for tampered payload', () => {
    const token = generateUnsubscribeToken(USER_ID, NotificationChannel.EMAIL, SECRET);
    const parts = token.split('.');
    const sig = parts[1] ?? '';
    const fakePayload = Buffer.from(
      JSON.stringify({ uid: 'hacker', ch: 'EMAIL', iat: 0 }),
    ).toString('base64url');

    expect(verifyUnsubscribeToken(`${fakePayload}.${sig}`, SECRET)).toBeNull();
  });

  it('returns null for token without dot', () => {
    expect(verifyUnsubscribeToken('nodottoken', SECRET)).toBeNull();
  });

  it('returns null for malformed base64', () => {
    expect(verifyUnsubscribeToken('abc.def', SECRET)).toBeNull();
  });
});
