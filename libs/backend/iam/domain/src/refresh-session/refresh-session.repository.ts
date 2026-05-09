import type { DateTime } from '@det/backend-shared-ddd';

import type { RefreshSession } from './refresh-session.aggregate';
import type { SessionId } from './session-id';
import type { UserId } from '../user/user-id';

export interface IRefreshSessionRepository {
  findById(id: SessionId): Promise<RefreshSession | null>;
  findByTokenHash(tokenHash: string): Promise<RefreshSession | null>;
  findByRotatedTokenHash(tokenHash: string): Promise<RefreshSession | null>;
  listActiveByUserId(userId: UserId): Promise<readonly RefreshSession[]>;
  save(session: RefreshSession): Promise<void>;
  compromiseAllByUserId(userId: UserId, now: DateTime): Promise<void>;
}
