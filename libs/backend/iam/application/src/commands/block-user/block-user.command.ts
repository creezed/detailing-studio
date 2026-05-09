import type { UserId } from '@det/backend-iam-domain';

export class BlockUserCommand {
  constructor(
    public readonly userId: UserId,
    public readonly actorId: UserId,
    public readonly reason: string,
  ) {}
}
