import type { UserId } from '@det/backend/iam/domain';

export class LogoutCommand {
  constructor(
    public readonly userId: UserId,
    public readonly refreshTokenHash: string,
  ) {}
}
