import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  AddMasterUnavailabilityCommand,
  BranchId,
  GetMasterScheduleQuery,
  MasterId,
  RemoveMasterUnavailabilityCommand,
  SetMasterScheduleCommand,
  UnavailabilityId,
} from '@det/backend-scheduling-application';
import type { MasterScheduleReadModel } from '@det/backend-scheduling-application';
import { CheckAbility } from '@det/backend-shared-auth';
import { DateTime } from '@det/backend-shared-ddd';

import {
  AddMasterUnavailabilityRequestDto,
  SetMasterScheduleRequestDto,
} from '../dto/master-schedule.dto';
import { toDomainMasterWeeklyPattern } from '../mappers/schedule.mapper';

@ApiTags('scheduling')
@ApiBearerAuth()
@Controller('masters')
export class MasterSchedulesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get(':id/schedule')
  @CheckAbility((ab) => ab.can('read', 'MasterSchedule'))
  @ApiOperation({ summary: 'Get master schedule' })
  @ApiOkResponse({ description: 'Master schedule' })
  @ApiQuery({ name: 'branchId', required: true, type: String })
  async getSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('branchId', ParseUUIDPipe) branchId: string,
  ): Promise<MasterScheduleReadModel> {
    return this.queryBus.execute(
      new GetMasterScheduleQuery(MasterId.from(id), BranchId.from(branchId)),
    );
  }

  @Put(':id/schedule')
  @CheckAbility((ab) => ab.can('update', 'MasterSchedule'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set master schedule' })
  @ApiNoContentResponse()
  async setSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetMasterScheduleRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new SetMasterScheduleCommand(
        MasterId.from(id),
        BranchId.from(dto.branchId),
        toDomainMasterWeeklyPattern(dto.weeklyPattern),
      ),
    );
  }

  @Post(':id/schedule/unavailabilities')
  @CheckAbility((ab) => ab.can('update', 'MasterSchedule'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add master unavailability' })
  @ApiNoContentResponse()
  async addUnavailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMasterUnavailabilityRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new AddMasterUnavailabilityCommand(
        MasterId.from(id),
        BranchId.from(dto.branchId),
        DateTime.from(dto.fromAt),
        DateTime.from(dto.toAt),
        dto.reason,
      ),
    );
  }

  @Delete(':id/schedule/unavailabilities/:unavailabilityId')
  @CheckAbility((ab) => ab.can('update', 'MasterSchedule'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove master unavailability' })
  @ApiQuery({ name: 'branchId', required: true, type: String })
  @ApiNoContentResponse()
  async removeUnavailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('unavailabilityId', ParseUUIDPipe) unavailabilityId: string,
    @Query('branchId', ParseUUIDPipe) branchId: string,
  ): Promise<void> {
    await this.commandBus.execute(
      new RemoveMasterUnavailabilityCommand(
        MasterId.from(id),
        BranchId.from(branchId),
        UnavailabilityId.from(unavailabilityId),
      ),
    );
  }
}
