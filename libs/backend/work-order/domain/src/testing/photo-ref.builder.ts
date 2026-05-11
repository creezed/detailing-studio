import { DateTime } from '@det/backend-shared-ddd';
import { PhotoId, UserId } from '@det/shared-types';

import { PhotoType } from '../value-objects/photo-type';

import type { PhotoRef } from '../value-objects/photo-ref.value-object';

let counter = 0;

export function buildPhotoRef(overrides: Partial<PhotoRef> = {}): PhotoRef {
  counter++;
  return {
    id: PhotoId.from(`00000000-0000-4000-a000-f${String(counter).padStart(11, '0')}`),
    type: PhotoType.BEFORE,
    url: `https://cdn.example.com/photo-${String(counter)}.jpg`,
    thumbnailUrl: `https://cdn.example.com/photo-${String(counter)}-thumb.jpg`,
    mime: 'image/jpeg',
    sizeBytes: 1024 * 100,
    uploadedBy: UserId.from('00000000-0000-4000-a000-a00000000001'),
    uploadedAt: DateTime.from('2024-06-15T09:30:00Z'),
    ...overrides,
  };
}

export function resetPhotoCounter(): void {
  counter = 0;
}
