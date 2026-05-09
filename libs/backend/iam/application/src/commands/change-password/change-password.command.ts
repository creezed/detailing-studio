import type { UserId } from '@det/backend-iam-domain';

export class ChangePasswordCommand {
  constructor(
    public readonly userId: UserId,
    public readonly oldPassword: string,
    public readonly newPassword: string,
  ) {}
}
