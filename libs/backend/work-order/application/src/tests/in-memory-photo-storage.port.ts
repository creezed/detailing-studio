import type {
  IPhotoStoragePort,
  PhotoUploadInput,
  PhotoUploadResult,
} from '../ports/photo-storage.port';

export class InMemoryPhotoStoragePort implements IPhotoStoragePort {
  private readonly _uploads = new Map<string, Buffer>();

  upload(input: PhotoUploadInput): Promise<PhotoUploadResult> {
    this._uploads.set(input.key, input.buffer);
    return Promise.resolve({
      sizeBytes: input.buffer.length,
      thumbnailUrl: `https://storage.test/${input.key}_thumb`,
      url: `https://storage.test/${input.key}`,
    });
  }

  delete(key: string): Promise<void> {
    this._uploads.delete(key);
    return Promise.resolve();
  }

  get uploadCount(): number {
    return this._uploads.size;
  }
}
