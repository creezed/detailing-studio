import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetClientDataExportQuery } from './get-client-data-export.query';
import { FILE_STORAGE_PORT } from '../../di/tokens';
import { DataExportNotFoundError } from '../../errors/application.errors';

import type { IFileStoragePort } from '../../ports/file-storage.port';

@QueryHandler(GetClientDataExportQuery)
export class GetClientDataExportHandler implements IQueryHandler<
  GetClientDataExportQuery,
  { signedUrl: string }
> {
  constructor(@Inject(FILE_STORAGE_PORT) private readonly _fileStorage: IFileStoragePort) {}

  async execute(query: GetClientDataExportQuery): Promise<{ signedUrl: string }> {
    const key = `data-exports/${query.clientId}/${query.exportId}.json`;
    const url = await this._fileStorage.getSignedUrl(key);

    if (!url) {
      throw new DataExportNotFoundError(query.exportId);
    }

    return { signedUrl: url };
  }
}
