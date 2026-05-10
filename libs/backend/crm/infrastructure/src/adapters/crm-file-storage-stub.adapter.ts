import { Injectable } from '@nestjs/common';

import type { FileUploadResult, IFileStoragePort } from '@det/backend-crm-application';

@Injectable()
export class CrmFileStorageStubAdapter implements IFileStoragePort {
  uploadJson(key: string, _data: unknown, ttlDays: number): Promise<FileUploadResult> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    return Promise.resolve({
      key,
      signedUrl: `https://stub-storage.local/${key}?expires=${expiresAt.toISOString()}`,
      expiresAt: expiresAt.toISOString(),
    });
  }

  getSignedUrl(key: string): Promise<string | null> {
    return Promise.resolve(`https://stub-storage.local/${key}`);
  }
}
