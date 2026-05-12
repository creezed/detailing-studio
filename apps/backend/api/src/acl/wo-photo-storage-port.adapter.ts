import { Injectable, Logger } from '@nestjs/common';

import type {
  IPhotoStoragePort,
  PhotoUploadInput,
  PhotoUploadResult,
} from '@det/backend-work-order-application';

/**
 * Stub adapter for photo storage port.
 * TODO: implement real MinIO/S3 adapter when @aws-sdk/client-s3 is added.
 */
@Injectable()
export class WoPhotoStoragePortAdapter implements IPhotoStoragePort {
  private readonly logger = new Logger(WoPhotoStoragePortAdapter.name);

  upload(input: PhotoUploadInput): Promise<PhotoUploadResult> {
    this.logger.warn(`upload called on stub adapter for key ${input.key}`);

    return Promise.resolve({
      sizeBytes: input.buffer.byteLength,
      thumbnailUrl: `stub://thumbnails/${input.key}`,
      url: `stub://photos/${input.key}`,
    });
  }

  delete(key: string): Promise<void> {
    this.logger.warn(`delete called on stub adapter for key ${key}`);

    return Promise.resolve();
  }
}
