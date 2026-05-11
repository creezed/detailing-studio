import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BayId, DeactivateBayCommand, UpdateBayCommand } from '@det/backend-scheduling-application';
import { CheckAbility } from '@det/backend-shared-auth';

import { UpdateBayRequestDto } from '../dto/bay.dto';

@ApiTags('scheduling')
@ApiBearerAuth()
@Controller('bays')
export class BaysController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':id')
  @CheckAbility((ab) => ab.can('update', 'Bay'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update bay' })
  @ApiNoContentResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBayRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(new UpdateBayCommand(BayId.from(id), dto.name));
  }

  @Delete(':id')
  @CheckAbility((ab) => ab.can('delete', 'Bay'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate bay' })
  @ApiNoContentResponse()
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeactivateBayCommand(BayId.from(id)));
  }
}
