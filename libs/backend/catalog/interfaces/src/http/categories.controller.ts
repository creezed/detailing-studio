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
  CreateServiceCategoryCommand,
  DeactivateServiceCategoryCommand,
  ListServiceCategoriesQuery,
  ServiceCategoryId,
  UpdateServiceCategoryCommand,
} from '@det/backend-catalog-application';
import type { ServiceCategoryDto } from '@det/backend-catalog-application';
import { CheckAbility } from '@det/backend-shared-auth';

import {
  CreateServiceCategoryRequestDto,
  ServiceCategoryCreatedResponseDto,
  ServiceCategoryResponseDto,
  UpdateServiceCategoryRequestDto,
} from '../dto/service-category.dto';

@ApiTags('service-categories')
@ApiBearerAuth()
@Controller('service-categories')
export class CategoriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'ServiceCategory'))
  @ApiOperation({ summary: 'List service categories' })
  @ApiOkResponse({ type: ServiceCategoryResponseDto, isArray: true })
  async list(): Promise<ServiceCategoryResponseDto[]> {
    return this.queryBus.execute<ListServiceCategoriesQuery, ServiceCategoryDto[]>(
      new ListServiceCategoriesQuery(),
    );
  }

  @Post()
  @CheckAbility((ab) => ab.can('manage', 'ServiceCategory'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create service category' })
  @ApiCreatedResponse({ type: ServiceCategoryCreatedResponseDto })
  async create(
    @Body() dto: CreateServiceCategoryRequestDto,
  ): Promise<ServiceCategoryCreatedResponseDto> {
    const id = await this.commandBus.execute<CreateServiceCategoryCommand, ServiceCategoryId>(
      new CreateServiceCategoryCommand(dto.name, dto.icon, dto.displayOrder),
    );

    return { id };
  }

  @Patch(':id')
  @CheckAbility((ab) => ab.can('manage', 'ServiceCategory'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update service category' })
  @ApiNoContentResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCategoryRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateServiceCategoryCommand(
        ServiceCategoryId.from(id),
        dto.name,
        dto.icon,
        dto.displayOrder,
      ),
    );
  }

  @Delete(':id')
  @CheckAbility((ab) => ab.can('manage', 'ServiceCategory'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate service category' })
  @ApiNoContentResponse()
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeactivateServiceCategoryCommand(ServiceCategoryId.from(id)));
  }
}
