import type { IIdGenerator } from '@det/backend-shared-ddd';
import { InvitationId as SharedInvitationId } from '@det/shared-types';
import type { InvitationId as SharedInvitationIdType } from '@det/shared-types';

export type InvitationId = SharedInvitationIdType;

export const InvitationId = {
  from(value: string): InvitationId {
    return SharedInvitationId.from(value);
  },

  generate(idGen: IIdGenerator): InvitationId {
    return SharedInvitationId.from(idGen.generate());
  },
};
