import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { IClientRepository, VehicleId } from '@det/backend-crm-domain';
import { BodyType, ClientId, LicensePlate, Vin } from '@det/backend-crm-domain';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { AddVehicleCommand } from './add-vehicle.command';
import { CLIENT_REPOSITORY, CLOCK, ID_GENERATOR } from '../../di/tokens';
import { ClientNotFoundError } from '../../errors/application.errors';

@CommandHandler(AddVehicleCommand)
export class AddVehicleHandler implements ICommandHandler<
  AddVehicleCommand,
  { vehicleId: VehicleId }
> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly _clientRepo: IClientRepository,
    @Inject(CLOCK) private readonly _clock: IClock,
    @Inject(ID_GENERATOR) private readonly _idGen: IIdGenerator,
  ) {}

  async execute(cmd: AddVehicleCommand): Promise<{ vehicleId: VehicleId }> {
    const client = await this._clientRepo.findById(ClientId.from(cmd.clientId));

    if (!client) {
      throw new ClientNotFoundError(cmd.clientId);
    }

    const vehicleId = client.addVehicle(
      {
        make: cmd.make,
        model: cmd.model,
        bodyType: cmd.bodyType as BodyType,
        licensePlate: cmd.licensePlate !== null ? LicensePlate.from(cmd.licensePlate) : null,
        vin: cmd.vin !== null ? Vin.from(cmd.vin) : null,
        year: cmd.year,
        color: cmd.color,
        comment: cmd.comment,
        idGen: this._idGen,
      },
      this._clock.now(),
    );

    await this._clientRepo.save(client);

    return { vehicleId };
  }
}
