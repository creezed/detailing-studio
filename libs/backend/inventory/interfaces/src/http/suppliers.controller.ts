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
  CreateSupplierCommand,
  DeactivateSupplierCommand,
  GetSupplierByIdQuery,
  ListSuppliersQuery,
  SupplierId,
  UpdateSupplierContactCommand,
} from '@det/backend-inventory-application';
import type { SupplierDetailReadModel } from '@det/backend-inventory-application';
import { CheckAbility } from '@det/backend-shared-auth';

import {
  CreateSupplierRequestDto,
  SupplierCreatedResponseDto,
  SupplierListQueryDto,
  UpdateSupplierRequestDto,
} from '../dto/supplier.dto';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Supplier'))
  @ApiOperation({ summary: 'Список поставщиков' })
  @ApiOkResponse({ description: 'Постраничный список поставщиков' })
  async list(@Query() q: SupplierListQueryDto): Promise<unknown> {
    return this.queryBus.execute(new ListSuppliersQuery(q.offset, q.limit, undefined, q.search));
  }

  @Post()
  @CheckAbility((ab) => ab.can('create', 'Supplier'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать поставщика' })
  @ApiCreatedResponse({ type: SupplierCreatedResponseDto })
  async create(@Body() dto: CreateSupplierRequestDto): Promise<SupplierCreatedResponseDto> {
    const { id } = await this.commandBus.execute<CreateSupplierCommand, { id: SupplierId }>(
      new CreateSupplierCommand(dto.name, dto.inn ?? null, {
        phone: dto.contact.phone ?? null,
        email: dto.contact.email ?? null,
        address: dto.contact.address ?? null,
      }),
    );

    return { id };
  }

  @Get(':id')
  @CheckAbility((ab) => ab.can('read', 'Supplier'))
  @ApiOperation({ summary: 'Детали поставщика' })
  @ApiOkResponse({ description: 'Поставщик по ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<SupplierDetailReadModel> {
    return this.queryBus.execute(new GetSupplierByIdQuery(SupplierId.from(id)));
  }

  @Patch(':id')
  @CheckAbility((ab) => ab.can('update', 'Supplier'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Обновить контакт поставщика' })
  @ApiNoContentResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateSupplierContactCommand(SupplierId.from(id), {
        phone: dto.contact.phone ?? null,
        email: dto.contact.email ?? null,
        address: dto.contact.address ?? null,
      }),
    );
  }

  @Delete(':id')
  @CheckAbility((ab) => ab.can('delete', 'Supplier'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Деактивировать поставщика' })
  @ApiNoContentResponse()
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeactivateSupplierCommand(SupplierId.from(id)));
  }
}
