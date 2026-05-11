import type { IIdGenerator } from '@det/backend-shared-ddd';
import { PhotoId as SharedPhotoId } from '@det/shared-types';
import type { PhotoId as SharedPhotoIdType } from '@det/shared-types';

export type PhotoId = SharedPhotoIdType;

export const PhotoId = {
  from(value: string): PhotoId {
    return SharedPhotoId.from(value);
  },

  generate(idGen: IIdGenerator): PhotoId {
    return SharedPhotoId.from(idGen.generate());
  },
};
