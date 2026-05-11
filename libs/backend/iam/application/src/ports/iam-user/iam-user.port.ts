import type { UserId } from '@det/backend-iam-domain';

import type { UserDetailDto } from '../../dto/user-detail/user-detail.dto';

export type UserReadModel = UserDetailDto;

export interface IamUserPort {
  getById(userId: UserId): Promise<UserReadModel | null>;
}
