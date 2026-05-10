import type { IIdGenerator } from '@det/backend-shared-ddd';
import { ClientId as SharedClientId } from '@det/shared-types';
import type { ClientId as SharedClientIdType } from '@det/shared-types';

export type ClientId = SharedClientIdType;

export const ClientId = {
  from(value: string): ClientId {
    return SharedClientId.from(value);
  },

  generate(idGen: IIdGenerator): ClientId {
    return SharedClientId.from(idGen.generate());
  },
};
