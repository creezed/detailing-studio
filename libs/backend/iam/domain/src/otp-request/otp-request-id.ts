import type { IIdGenerator } from '@det/backend-shared-ddd';
import { OtpRequestId as SharedOtpRequestId } from '@det/shared-types';
import type { OtpRequestId as SharedOtpRequestIdType } from '@det/shared-types';

export type OtpRequestId = SharedOtpRequestIdType;

export const OtpRequestId = {
  from(value: string): OtpRequestId {
    return SharedOtpRequestId.from(value);
  },

  generate(idGen: IIdGenerator): OtpRequestId {
    return SharedOtpRequestId.from(idGen.generate());
  },
};
