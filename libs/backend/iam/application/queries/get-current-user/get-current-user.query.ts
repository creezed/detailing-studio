import type { UserId } from '@det/backend/iam/domain';

export class GetCurrentUserQuery {
  constructor(public readonly userId: UserId) {}
}
