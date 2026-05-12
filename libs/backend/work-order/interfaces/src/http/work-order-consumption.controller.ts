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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';
import {
  AddConsumptionCommand,
  RemoveConsumptionLineCommand,
  UpdateConsumptionLineCommand,
} from '@det/backend-work-order-application';

import { AddConsumptionRequestDto, UpdateConsumptionRequestDto } from '../dto/consumption.dto';

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders/:workOrderId/consumption')
export class WorkOrderConsumptionController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @CheckAbility((ab) => ab.can('add-consumption', 'WorkOrder'))
  @ApiOperation({ summary: 'Добавить строку фактического расхода' })
  @ApiCreatedResponse({ description: 'ID созданной строки' })
  async add(
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddConsumptionRequestDto,
  ): Promise<{ id: string }> {
    const id: string = await this.commandBus.execute(
      new AddConsumptionCommand(
        workOrderId,
        dto.skuId,
        Quantity.of(dto.amount, dto.unit as UnitOfMeasure),
        user.id,
        dto.deviationReason,
        dto.comment,
      ),
    );

    return { id };
  }

  @Patch(':lineId')
  @CheckAbility((ab) => ab.can('update-consumption', 'WorkOrder'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Обновить строку расхода' })
  @ApiNoContentResponse()
  async update(
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConsumptionRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateConsumptionLineCommand(
        workOrderId,
        lineId,
        Quantity.of(dto.amount, dto.unit as UnitOfMeasure),
        user.id,
        dto.deviationReason,
        dto.comment,
      ),
    );
  }

  @Delete(':lineId')
  @CheckAbility((ab) => ab.can('remove-consumption', 'WorkOrder'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить строку расхода' })
  @ApiNoContentResponse()
  async remove(
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new RemoveConsumptionLineCommand(workOrderId, lineId, user.id));
  }
}
