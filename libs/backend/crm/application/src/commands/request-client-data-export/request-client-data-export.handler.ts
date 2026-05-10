import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { RequestClientDataExportCommand } from './request-client-data-export.command';
import { CLIENT_READ_PORT, CLOCK, FILE_STORAGE_PORT, ID_GENERATOR } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

import type { IClientReadPort } from '../../ports/client-read.port';
import type { IFileStoragePort } from '../../ports/file-storage.port';

const DATA_EXPORT_TTL_DAYS = 7;

@CommandHandler(RequestClientDataExportCommand)
export class RequestClientDataExportHandler implements ICommandHandler<
  RequestClientDataExportCommand,
  { exportId: string; signedUrl: string }
> {
  constructor(
    @Inject(CLIENT_READ_PORT) private readonly _readPort: IClientReadPort,
    @Inject(FILE_STORAGE_PORT) private readonly _fileStorage: IFileStoragePort,
    @Inject(CLOCK) private readonly _clock: IClock,
    @Inject(ID_GENERATOR) private readonly _idGen: IIdGenerator,
  ) {}

  async execute(
    cmd: RequestClientDataExportCommand,
  ): Promise<{ exportId: string; signedUrl: string }> {
    const clientDetail = await this._readPort.findById(cmd.clientId);

    if (!clientDetail) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const vehicles = await this._readPort.findVehicles(cmd.clientId);

    const exportBundle = {
      exportedAt: this._clock.now().iso(),
      requestedBy: cmd.requestedBy,
      client: clientDetail,
      vehicles,
    };

    const exportId = this._idGen.generate();
    const key = `data-exports/${cmd.clientId}/${exportId}.json`;

    const result = await this._fileStorage.uploadJson(key, exportBundle, DATA_EXPORT_TTL_DAYS);

    return { exportId, signedUrl: result.signedUrl };
  }
}
