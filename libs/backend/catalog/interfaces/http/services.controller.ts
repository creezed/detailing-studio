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
  ChangeServicePriceCommand,
  CreateServiceCommand,
  DeactivateServiceCommand,
  GetClientServiceCatalogQuery,
  GetServiceByIdQuery,
  GetServicePriceHistoryQuery,
  GetServiceQueryCapabilitiesQuery,
  ListServicesQuery,
  type QueryCapabilitiesDto,
  type ServiceCatalogItemDto,
  ServiceCategoryId,
  ServiceId,
  type ServiceDto,
  type ServicePriceHistoryDto,
  SetServiceMaterialNormsCommand,
  UpdateServiceCommand,
} from '@det/backend/catalog/application';
import { CheckAbility, Public } from '@det/backend/shared/auth';
import { DynamicQueryDto } from '@det/backend/shared/querying';
import type { PaginatedResponseDto } from '@det/backend/shared/querying';

import {
  ChangeServicePriceRequestDto,
  CreateServiceRequestDto,
  ServiceCreatedResponseDto,
  SetMaterialNormsRequestDto,
  UpdateServiceRequestDto,
} from '../dto/service.dto';
import { toDomainMaterialNorms, toDomainPricing } from '../mappers/pricing.mapper';

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Service'))
  @ApiOperation({ summary: 'List services' })
  @ApiOkResponse({ description: 'Paginated list of services' })
  async list(@Query() query: DynamicQueryDto): Promise<PaginatedResponseDto<ServiceDto>> {
    return this.queryBus.execute<ListServicesQuery, PaginatedResponseDto<ServiceDto>>(
      new ListServicesQuery(query),
    );
  }

  @Get('query-capabilities')
  @CheckAbility((ab) => ab.can('read', 'Service'))
  @ApiOperation({ summary: 'Get service query capabilities' })
  @ApiOkResponse({ description: 'Available service filters and sorts' })
  async queryCapabilities(): Promise<QueryCapabilitiesDto> {
    return this.queryBus.execute<GetServiceQueryCapabilitiesQuery, QueryCapabilitiesDto>(
      new GetServiceQueryCapabilitiesQuery(),
    );
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public service catalog (for client app)' })
  @ApiOkResponse({ description: 'Public catalog without norms' })
  async publicCatalog(): Promise<ServiceCatalogItemDto[]> {
    return this.queryBus.execute<GetClientServiceCatalogQuery, ServiceCatalogItemDto[]>(
      new GetClientServiceCatalogQuery(),
    );
  }

  @Post()
  @CheckAbility((ab) => ab.can('manage', 'Service'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create service' })
  @ApiCreatedResponse({ type: ServiceCreatedResponseDto })
  async create(@Body() dto: CreateServiceRequestDto): Promise<ServiceCreatedResponseDto> {
    const id = await this.commandBus.execute<CreateServiceCommand, ServiceId>(
      new CreateServiceCommand(
        dto.name,
        dto.description,
        ServiceCategoryId.from(dto.categoryId),
        dto.durationMinutes,
        toDomainPricing(dto.pricing),
        toDomainMaterialNorms(dto.materialNorms),
        dto.displayOrder,
      ),
    );

    return { id };
  }

  @Get(':id')
  @CheckAbility((ab) => ab.can('read', 'Service'))
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiOkResponse({ description: 'Service details' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceDto> {
    return this.queryBus.execute<GetServiceByIdQuery, ServiceDto>(
      new GetServiceByIdQuery(ServiceId.from(id)),
    );
  }

  @Patch(':id')
  @CheckAbility((ab) => ab.can('manage', 'Service'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update service' })
  @ApiNoContentResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateServiceCommand(ServiceId.from(id), dto.name, dto.description, dto.durationMinutes),
    );
  }

  @Patch(':id/price')
  @CheckAbility((ab) => ab.can('manage', 'Service'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change service price' })
  @ApiNoContentResponse()
  async changePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeServicePriceRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new ChangeServicePriceCommand(ServiceId.from(id), toDomainPricing(dto.pricing)),
    );
  }

  @Patch(':id/material-norms')
  @CheckAbility((ab) => ab.can('manage', 'Service'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set service material norms' })
  @ApiNoContentResponse()
  async setMaterialNorms(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetMaterialNormsRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new SetServiceMaterialNormsCommand(ServiceId.from(id), toDomainMaterialNorms(dto.norms)),
    );
  }

  @Delete(':id')
  @CheckAbility((ab) => ab.can('manage', 'Service'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate service' })
  @ApiNoContentResponse()
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeactivateServiceCommand(ServiceId.from(id)));
  }

  @Get(':id/price-history')
  @CheckAbility((ab) => ab.can('read', 'Service'))
  @ApiOperation({ summary: 'Get service price history' })
  @ApiOkResponse({ description: 'Price history' })
  async priceHistory(@Param('id', ParseUUIDPipe) id: string): Promise<ServicePriceHistoryDto> {
    return this.queryBus.execute<GetServicePriceHistoryQuery, ServicePriceHistoryDto>(
      new GetServicePriceHistoryQuery(ServiceId.from(id)),
    );
  }
}
