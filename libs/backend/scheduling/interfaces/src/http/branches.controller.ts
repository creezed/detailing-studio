import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  AddBranchScheduleExceptionCommand,
  CreateBayCommand,
  CreateBranchCommand,
  DeactivateBranchCommand,
  GetBranchByIdQuery,
  GetBranchScheduleQuery,
  ListBaysByBranchQuery,
  ListBranchesQuery,
  RemoveBranchScheduleExceptionCommand,
  SetBranchScheduleCommand,
  UpdateBranchCommand,
  BranchId,
  BayId,
} from '@det/backend-scheduling-application';
import type {
  BayReadModel,
  BranchDetailReadModel,
  BranchListItemReadModel,
  BranchScheduleReadModel,
  PaginatedResult,
} from '@det/backend-scheduling-application';
import { CheckAbility } from '@det/backend-shared-auth';

import { BayCreatedResponseDto, CreateBayRequestDto } from '../dto/bay.dto';
import {
  BranchCreatedResponseDto,
  CreateBranchRequestDto,
  ListBranchesQueryDto,
  UpdateBranchRequestDto,
} from '../dto/branch.dto';
import { AddScheduleExceptionRequestDto, SetBranchScheduleRequestDto } from '../dto/schedule.dto';
import { toDomainScheduleException, toDomainWeeklyPattern } from '../mappers/schedule.mapper';

@ApiTags('scheduling')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Branch'))
  @ApiOperation({ summary: 'List branches' })
  @ApiOkResponse({ description: 'Paginated list of branches' })
  async list(@Query() q: ListBranchesQueryDto): Promise<PaginatedResult<BranchListItemReadModel>> {
    return this.queryBus.execute(new ListBranchesQuery(q.isActive, q.page, q.pageSize));
  }

  @Post()
  @CheckAbility((ab) => ab.can('create', 'Branch'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create branch' })
  @ApiCreatedResponse({ type: BranchCreatedResponseDto })
  async create(@Body() dto: CreateBranchRequestDto): Promise<BranchCreatedResponseDto> {
    const id = await this.commandBus.execute<CreateBranchCommand, BranchId>(
      new CreateBranchCommand(dto.name, dto.address, dto.timezone),
    );

    return { id };
  }

  @Get(':id')
  @CheckAbility((ab) => ab.can('read', 'Branch'))
  @ApiOperation({ summary: 'Get branch by ID' })
  @ApiOkResponse({ description: 'Branch details' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<BranchDetailReadModel> {
    return this.queryBus.execute(new GetBranchByIdQuery(BranchId.from(id)));
  }

  @Patch(':id')
  @CheckAbility((ab) => ab.can('update', 'Branch'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update branch' })
  @ApiNoContentResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateBranchCommand(BranchId.from(id), dto.name, dto.address, dto.timezone),
    );
  }

  @Delete(':id')
  @CheckAbility((ab) => ab.can('delete', 'Branch'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate branch' })
  @ApiNoContentResponse()
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeactivateBranchCommand(BranchId.from(id)));
  }

  @Get(':id/schedule')
  @CheckAbility((ab) => ab.can('read', 'BranchSchedule'))
  @ApiOperation({ summary: 'Get branch schedule' })
  @ApiOkResponse({ description: 'Branch schedule' })
  async getSchedule(@Param('id', ParseUUIDPipe) id: string): Promise<BranchScheduleReadModel> {
    return this.queryBus.execute(new GetBranchScheduleQuery(BranchId.from(id)));
  }

  @Put(':id/schedule')
  @CheckAbility((ab) => ab.can('update', 'BranchSchedule'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set branch schedule' })
  @ApiNoContentResponse()
  async setSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetBranchScheduleRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new SetBranchScheduleCommand(BranchId.from(id), toDomainWeeklyPattern(dto.weeklyPattern)),
    );
  }

  @Post(':id/schedule/exceptions')
  @CheckAbility((ab) => ab.can('update', 'BranchSchedule'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add branch schedule exception' })
  @ApiNoContentResponse()
  async addException(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddScheduleExceptionRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new AddBranchScheduleExceptionCommand(BranchId.from(id), toDomainScheduleException(dto)),
    );
  }

  @Delete(':id/schedule/exceptions/:date')
  @CheckAbility((ab) => ab.can('update', 'BranchSchedule'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove branch schedule exception' })
  @ApiNoContentResponse()
  async removeException(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('date') date: string,
  ): Promise<void> {
    await this.commandBus.execute(
      new RemoveBranchScheduleExceptionCommand(BranchId.from(id), date),
    );
  }

  @Get(':id/bays')
  @CheckAbility((ab) => ab.can('read', 'Bay'))
  @ApiOperation({ summary: 'List bays for branch' })
  @ApiOkResponse({ description: 'List of bays' })
  async listBays(@Param('id', ParseUUIDPipe) id: string): Promise<readonly BayReadModel[]> {
    return this.queryBus.execute(new ListBaysByBranchQuery(BranchId.from(id)));
  }

  @Post(':id/bays')
  @CheckAbility((ab) => ab.can('create', 'Bay'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create bay' })
  @ApiCreatedResponse({ type: BayCreatedResponseDto })
  async createBay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBayRequestDto,
  ): Promise<BayCreatedResponseDto> {
    const bayId = await this.commandBus.execute<CreateBayCommand, BayId>(
      new CreateBayCommand(BranchId.from(id), dto.name),
    );

    return { id: bayId };
  }
}
