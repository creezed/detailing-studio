import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListClientsQuery } from './list-clients.query';
import { CLIENT_READ_PORT } from '../../di/tokens';

import type { IClientReadPort, PaginatedResult } from '../../ports/client-read.port';
import type { ClientListItemReadModel } from '../../read-models/client.read-model';

@QueryHandler(ListClientsQuery)
export class ListClientsHandler implements IQueryHandler<
  ListClientsQuery,
  PaginatedResult<ClientListItemReadModel>
> {
  constructor(@Inject(CLIENT_READ_PORT) private readonly _readPort: IClientReadPort) {}

  async execute(query: ListClientsQuery): Promise<PaginatedResult<ClientListItemReadModel>> {
    return this._readPort.list({
      page: query.page,
      pageSize: query.pageSize,
      fullName: query.fullName,
      phone: query.phone,
      licensePlate: query.licensePlate,
      type: query.type,
    });
  }
}
