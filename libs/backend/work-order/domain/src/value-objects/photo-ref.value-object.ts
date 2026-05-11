import type { DateTime } from '@det/backend-shared-ddd';
import type { UserId } from '@det/shared-types';

import type { PhotoId } from './photo-id';
import type { PhotoType } from './photo-type';

const ALLOWED_MIMES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/heic']);

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_URL_LENGTH = 2048;

export interface PhotoRef {
  readonly id: PhotoId;
  readonly type: PhotoType;
  readonly url: string;
  readonly thumbnailUrl: string;
  readonly mime: string;
  readonly sizeBytes: number;
  readonly uploadedBy: UserId;
  readonly uploadedAt: DateTime;
}

export function validatePhotoRef(photo: PhotoRef): void {
  if (!ALLOWED_MIMES.has(photo.mime)) {
    throw new InvalidPhotoMimeError(photo.mime);
  }
  if (photo.sizeBytes <= 0 || photo.sizeBytes > MAX_SIZE_BYTES) {
    throw new InvalidPhotoSizeError(photo.sizeBytes);
  }
  if (photo.url.length < 1 || photo.url.length > MAX_URL_LENGTH) {
    throw new InvalidPhotoUrlError(photo.url.length);
  }
}

export class InvalidPhotoMimeError extends Error {
  constructor(mime: string) {
    super(`Invalid photo MIME type: ${mime}. Allowed: image/jpeg, image/png, image/heic`);
    this.name = 'InvalidPhotoMimeError';
  }
}

export class InvalidPhotoSizeError extends Error {
  constructor(sizeBytes: number) {
    super(`Invalid photo size: ${String(sizeBytes)} bytes. Must be 1..${String(MAX_SIZE_BYTES)}`);
    this.name = 'InvalidPhotoSizeError';
  }
}

export class InvalidPhotoUrlError extends Error {
  constructor(length: number) {
    super(`Invalid photo URL length: ${String(length)}. Must be 1..${String(MAX_URL_LENGTH)}`);
    this.name = 'InvalidPhotoUrlError';
  }
}
