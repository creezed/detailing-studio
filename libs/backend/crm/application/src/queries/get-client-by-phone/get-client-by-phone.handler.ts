import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetClientByPhoneQuery } from './get-client-by-phone.query';
import { CLIENT_READ_PORT } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

import type { IClientReadPort } from '../../ports/client-read.port';
import type { ClientDetailReadModel } from '../../read-models/client.read-model';

@QueryHandler(GetClientByPhoneQuery)
export class GetClientByPhoneHandler implements IQueryHandler<
  GetClientByPhoneQuery,
  ClientDetailReadModel
> {
  constructor(@Inject(CLIENT_READ_PORT) private readonly _readPort: IClientReadPort) {}

  async execute(query: GetClientByPhoneQuery): Promise<ClientDetailReadModel> {
    const result = await this._readPort.findByPhone(query.phone);

    if (!result) {
      throw new ClientNotFoundError(query.phone);
    }

    return result;
  }
}
