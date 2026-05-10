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
  CreateSkuCommand,
  DeactivateSkuCommand,
  GetSkuByBarcodeQuery,
  GetSkuByIdQuery,
  ListSkusQuery,
  SkuId,
  UpdateSkuCommand,
} from '@det/backend-inventory-application';
import type { SkuDetailReadModel } from '@det/backend-inventory-application';
import { CheckAbility } from '@det/backend-shared-auth';

import {
  CreateSkuRequestDto,
  SkuCreatedResponseDto,
  SkuListQueryDto,
  UpdateSkuRequestDto,
} from '../dto/sku.dto';

@ApiTags('skus')
@ApiBearerAuth()
@Controller('skus')
export class SkusController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Sku'))
  @ApiOperation({ summary: 'Список SKU' })
  @ApiOkResponse({ description: 'Постраничный список SKU' })
  async list(@Query() q: SkuListQueryDto): Promise<unknown> {
    return this.queryBus.execute(
      new ListSkusQuery(q.offset, q.limit, q.group, undefined, q.search),
    );
  }

  @Get('by-barcode')
  @CheckAbility((ab) => ab.can('read', 'Sku'))
  @ApiOperation({ summary: 'Поиск SKU по штрих-коду' })
  @ApiOkResponse({ description: 'Детали SKU' })
  async byBarcode(@Query('value') value: string): Promise<SkuDetailReadModel> {
    return this.queryBus.execute(new GetSkuByBarcodeQuery(value));
  }

  @Post()
  @CheckAbility((ab) => ab.can('create', 'Sku'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать SKU' })
  @ApiCreatedResponse({ type: SkuCreatedResponseDto })
  async create(@Body() dto: CreateSkuRequestDto): Promise<SkuCreatedResponseDto> {
    const { id } = await this.commandBus.execute<CreateSkuCommand, { id: SkuId }>(
      new CreateSkuCommand(
        dto.articleNumber,
        dto.name,
        dto.group,
        dto.baseUnit,
        dto.hasExpiry,
        dto.packagings.map((p) => ({
          name: p.name,
          coefficient: p.coefficient,
        })),
        dto.barcode ?? null,
        dto.photoUrl ?? null,
        dto.description,
      ),
    );

    return { id };
  }

  @Get(':id')
  @CheckAbility((ab) => ab.can('read', 'Sku'))
  @ApiOperation({ summary: 'Детали SKU' })
  @ApiOkResponse({ description: 'SKU по ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<SkuDetailReadModel> {
    return this.queryBus.execute(new GetSkuByIdQuery(SkuId.from(id)));
  }

  @Patch(':id')
  @CheckAbility((ab) => ab.can('update', 'Sku'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Обновить SKU' })
  @ApiNoContentResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSkuRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateSkuCommand(
        SkuId.from(id),
        dto.name,
        dto.group,
        dto.packagings?.map((p, i) => ({
          id: `pkg-${String(i)}`,
          name: p.name,
          coefficient: p.coefficient,
        })),
      ),
    );
  }

  @Delete(':id')
  @CheckAbility((ab) => ab.can('delete', 'Sku'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Деактивировать SKU' })
  @ApiNoContentResponse()
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeactivateSkuCommand(SkuId.from(id)));
  }
}
