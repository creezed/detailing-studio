import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetClientVehiclesQuery } from './get-client-vehicles.query';
import { CLIENT_READ_PORT } from '../../di/tokens';

import type { IClientReadPort } from '../../ports/client-read.port';
import type { VehicleReadModel } from '../../read-models/client.read-model';

@QueryHandler(GetClientVehiclesQuery)
export class GetClientVehiclesHandler implements IQueryHandler<
  GetClientVehiclesQuery,
  readonly VehicleReadModel[]
> {
  constructor(@Inject(CLIENT_READ_PORT) private readonly _readPort: IClientReadPort) {}

  async execute(query: GetClientVehiclesQuery): Promise<readonly VehicleReadModel[]> {
    return this._readPort.findVehicles(query.clientId);
  }
}
