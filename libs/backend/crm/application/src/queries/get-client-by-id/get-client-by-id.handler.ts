import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetClientByIdQuery } from './get-client-by-id.query';
import { CLIENT_READ_PORT } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

import type { IClientReadPort } from '../../ports/client-read.port';
import type { ClientDetailReadModel } from '../../read-models/client.read-model';

@QueryHandler(GetClientByIdQuery)
export class GetClientByIdHandler implements IQueryHandler<
  GetClientByIdQuery,
  ClientDetailReadModel
> {
  constructor(@Inject(CLIENT_READ_PORT) private readonly _readPort: IClientReadPort) {}

  async execute(query: GetClientByIdQuery): Promise<ClientDetailReadModel> {
    const result = await this._readPort.findById(query.clientId);

    if (!result) {
      throw new ClientNotFoundError(query.clientId);
    }

    return result;
  }
}
