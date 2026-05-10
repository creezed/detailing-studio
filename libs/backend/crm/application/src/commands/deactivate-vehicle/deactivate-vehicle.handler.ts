import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository } from '@det/backend-crm-domain';
import { ClientId, VehicleId } from '@det/backend-crm-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { DeactivateVehicleCommand } from './deactivate-vehicle.command';
import { CLIENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

@CommandHandler(DeactivateVehicleCommand)
export class DeactivateVehicleHandler implements ICommandHandler<DeactivateVehicleCommand, void> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
  ) {}

  async execute(cmd: DeactivateVehicleCommand): Promise<void> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    client.deactivateVehicle(VehicleId.from(cmd.vehicleId), this._clock.now());

    await this._clientRepo.save(client);
  }
}
