import type { IIdGenerator } from '@det/backend/shared/ddd';
import { SessionId as SharedSessionId } from '@det/shared/types';
import type { SessionId as SharedSessionIdType } from '@det/shared/types';

export type SessionId = SharedSessionIdType;

export const SessionId = {
  from(value: string): SessionId {
    return SharedSessionId.from(value);
  },

  generate(idGen: IIdGenerator): SessionId {
    return SharedSessionId.from(idGen.generate());
  },
};
