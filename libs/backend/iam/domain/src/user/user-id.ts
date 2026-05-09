import type { IIdGenerator } from '@det/backend-shared-ddd';
import { UserId as SharedUserId } from '@det/shared-types';
import type { UserId as SharedUserIdType } from '@det/shared-types';

export type UserId = SharedUserIdType;

export const UserId = {
  from(value: string): UserId {
    return SharedUserId.from(value);
  },

  generate(idGen: IIdGenerator): UserId {
    return SharedUserId.from(idGen.generate());
  },
};
