export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

export interface FileUploadResult {
  readonly key: string;
  readonly signedUrl: string;
  readonly expiresAt: string;
}

export interface IFileStoragePort {
  uploadJson(key: string, data: unknown, ttlDays: number): Promise<FileUploadResult>;
  getSignedUrl(key: string): Promise<string | null>;
}
