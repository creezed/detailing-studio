import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';

import {
  AddVehicleCommand,
  DeactivateVehicleCommand,
  UpdateVehicleCommand,
} from '@det/backend-crm-application';
import { CheckAbility } from '@det/backend-shared-auth';

import { AddVehicleRequestDto, UpdateVehicleRequestDto } from '../dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients/:clientId/vehicles')
export class VehiclesController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @CheckAbility((ability) => ability.can('create', 'Vehicle'))
  @ApiCreatedResponse()
  async add(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: AddVehicleRequestDto,
  ): Promise<{ id: string }> {
    const id = await this.commandBus.execute<AddVehicleCommand, string>(
      new AddVehicleCommand(
        clientId,
        dto.make,
        dto.model,
        dto.bodyType,
        dto.licensePlate ?? null,
        dto.vin ?? null,
        dto.year ?? null,
        dto.color ?? null,
        dto.comment ?? '',
      ),
    );

    return { id };
  }

  @Patch(':vehicleId')
  @CheckAbility((ability) => ability.can('update', 'Vehicle'))
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: UpdateVehicleRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateVehicleCommand(
        clientId,
        vehicleId,
        dto.make,
        dto.model,
        dto.bodyType,
        dto.licensePlate,
        dto.vin,
        dto.year,
        dto.color,
        dto.comment,
      ),
    );
  }

  @Delete(':vehicleId')
  @CheckAbility((ability) => ability.can('delete', 'Vehicle'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async deactivate(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<void> {
    await this.commandBus.execute(new DeactivateVehicleCommand(clientId, vehicleId));
  }
}
