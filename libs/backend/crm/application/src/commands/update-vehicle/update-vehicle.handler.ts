import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository, UpdateVehicleProps } from '@det/backend-crm-domain';
import { ClientId, LicensePlate, VehicleId, Vin } from '@det/backend-crm-domain';
import type { IClock } from '@det/backend-shared-ddd';

import { UpdateVehicleCommand } from './update-vehicle.command';
import { CLIENT_REPOSITORY, CLOCK } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

@CommandHandler(UpdateVehicleCommand)
export class UpdateVehicleHandler implements ICommandHandler<UpdateVehicleCommand, void> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
  ) {}

  async execute(cmd: UpdateVehicleCommand): Promise<void> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const props: UpdateVehicleProps = {};

    if (cmd.make !== undefined) {
      (props as Record<string, unknown>)['make'] = cmd.make;
    }

    if (cmd.model !== undefined) {
      (props as Record<string, unknown>)['model'] = cmd.model;
    }

    if (cmd.bodyType !== undefined) {
      (props as Record<string, unknown>)['bodyType'] = cmd.bodyType;
    }

    if (cmd.licensePlate !== undefined) {
      (props as Record<string, unknown>)['licensePlate'] =
        cmd.licensePlate !== null ? LicensePlate.from(cmd.licensePlate) : null;
    }

    if (cmd.vin !== undefined) {
      (props as Record<string, unknown>)['vin'] = cmd.vin !== null ? Vin.from(cmd.vin) : null;
    }

    if (cmd.year !== undefined) {
      (props as Record<string, unknown>)['year'] = cmd.year;
    }

    if (cmd.color !== undefined) {
      (props as Record<string, unknown>)['color'] = cmd.color;
    }

    if (cmd.comment !== undefined) {
      (props as Record<string, unknown>)['comment'] = cmd.comment;
    }

    client.updateVehicle(VehicleId.from(cmd.vehicleId), props, this._clock.now());

    await this._clientRepo.save(client);
  }
}
