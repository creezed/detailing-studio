export interface PhotoUploadInput {
  readonly buffer: Buffer;
  readonly mime: string;
  readonly key: string;
}

export interface PhotoUploadResult {
  readonly url: string;
  readonly thumbnailUrl: string;
  readonly sizeBytes: number;
}

export interface IPhotoStoragePort {
  upload(input: PhotoUploadInput): Promise<PhotoUploadResult>;
  delete(key: string): Promise<void>;
}
