import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  AnonymizeClientCommand,
  GetClientByIdQuery,
  GetClientVisitHistoryQuery,
  ListClientsQuery,
  RegisterGuestClientCommand,
  RegisterRegularClientCommand,
  RequestClientDataExportCommand,
  UpgradeClientToRegularCommand,
  UpdateClientProfileCommand,
} from '@det/backend-crm-application';
import type {
  ClientDetailReadModel,
  CursorPaginatedResult,
  PaginatedResult,
  RegisterClientConsentInput,
  VisitHistoryItemReadModel,
} from '@det/backend-crm-application';
import { CheckAbility } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';

import { CurrentUser } from '../decorators/current-user.decorator';
import {
  AnonymizeClientRequestDto,
  ClientDetailResponseDto,
  ClientListItemResponseDto,
  CreateClientRequestDto,
  DataExportResponseDto,
  PaginatedClientsResponseDto,
  UpdateClientRequestDto,
} from '../dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ability) => ability.can('read', 'Client'))
  @ApiOkResponse({ type: PaginatedClientsResponseDto })
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('fullName') fullName?: string,
    @Query('phone') phone?: string,
    @Query('type') type?: string,
  ): Promise<PaginatedClientsResponseDto> {
    const result = await this.queryBus.execute<
      ListClientsQuery,
      PaginatedResult<ClientListItemResponseDto>
    >(new ListClientsQuery(page, pageSize, fullName, phone, undefined, type));

    return {
      items: [...result.items],
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Post()
  @CheckAbility((ability) => ability.can('create', 'Client'))
  @ApiCreatedResponse()
  async create(@Body() dto: CreateClientRequestDto): Promise<{ id: string }> {
    const consents = dto.consents.map(
      (c) =>
        ({
          type: c.type,
          policyVersion: c.policyVersion ?? '1.0.0',
        }) as RegisterClientConsentInput,
    );

    if (dto.type === 'GUEST') {
      const id = await this.commandBus.execute<RegisterGuestClientCommand, string>(
        new RegisterGuestClientCommand(
          dto.lastName,
          dto.firstName,
          dto.middleName ?? null,
          dto.phone,
          dto.email ?? null,
          dto.birthDate ?? null,
          dto.source ?? null,
          dto.comment ?? '',
          consents,
        ),
      );

      return { id };
    }

    const id = await this.commandBus.execute<RegisterRegularClientCommand, string>(
      new RegisterRegularClientCommand(
        dto.lastName,
        dto.firstName,
        dto.middleName ?? null,
        dto.phone,
        dto.email ?? null,
        dto.birthDate ?? null,
        dto.source ?? null,
        dto.comment ?? '',
        consents,
      ),
    );

    return { id };
  }

  @Get(':id')
  @CheckAbility((ability) => ability.can('read', 'Client'))
  @ApiOkResponse({ type: ClientDetailResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ClientDetailReadModel> {
    return this.queryBus.execute<GetClientByIdQuery, ClientDetailReadModel>(
      new GetClientByIdQuery(id),
    );
  }

  @Patch(':id')
  @CheckAbility((ability) => ability.can('update', 'Client'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateClientProfileCommand(
        id,
        dto.lastName,
        dto.firstName,
        dto.middleName,
        dto.phone,
        dto.email,
        dto.birthDate,
        dto.source,
        dto.comment,
      ),
    );
  }

  @Post(':id/upgrade')
  @CheckAbility((ability) => ability.can('update', 'Client'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  async upgrade(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new UpgradeClientToRegularCommand(id));
  }

  @Post(':id/anonymize')
  @CheckAbility((ability) => ability.can('anonymize', 'Client'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  async anonymize(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AnonymizeClientRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new AnonymizeClientCommand(id, user.id, dto.reason, dto.anonymizationRequestId ?? null),
    );
  }

  @Get(':id/data-export')
  @CheckAbility((ability) => ability.can('export-data', 'Client'))
  @ApiOkResponse({ type: DataExportResponseDto })
  async dataExport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataExportResponseDto> {
    return this.commandBus.execute<RequestClientDataExportCommand, DataExportResponseDto>(
      new RequestClientDataExportCommand(id, user.id),
    );
  }

  @Get(':id/visit-history')
  @CheckAbility((ability) => ability.can('read', 'VisitHistory'))
  @ApiOkResponse()
  async visitHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ): Promise<CursorPaginatedResult<VisitHistoryItemReadModel>> {
    return this.queryBus.execute(new GetClientVisitHistoryQuery(id, limit, cursor ?? null));
  }
}
