import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
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
  CancelReceiptCommand,
  CreateReceiptCommand,
  GetReceiptByIdQuery,
  ListReceiptsQuery,
  PostReceiptCommand,
  ReceiptId,
  UpdateReceiptCommand,
} from '@det/backend-inventory-application';
import type { ReceiptDetailReadModel } from '@det/backend-inventory-application';
import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { DateTime, Quantity } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SupplierId, UserId } from '@det/shared-types';

import {
  CancelReceiptRequestDto,
  CreateReceiptRequestDto,
  ReceiptCreatedResponseDto,
  ReceiptListQueryDto,
  UpdateReceiptRequestDto,
} from '../dto/receipt.dto';
import { centsToMoney } from '../mappers/money.mapper';

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Receipt'))
  @ApiOperation({ summary: 'Список приходов' })
  @ApiOkResponse({ description: 'Постраничный список приходов' })
  async list(@Query() q: ReceiptListQueryDto): Promise<unknown> {
    return this.queryBus.execute(
      new ListReceiptsQuery(q.offset, q.limit, q.branchId, q.status, q.fromDate, q.toDate),
    );
  }

  @Post()
  @CheckAbility((ab) => ab.can('create', 'Receipt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать приход (черновик)' })
  @ApiCreatedResponse({ type: ReceiptCreatedResponseDto })
  async create(
    @Body() dto: CreateReceiptRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReceiptCreatedResponseDto> {
    const id = await this.commandBus.execute<CreateReceiptCommand, ReceiptId>(
      new CreateReceiptCommand(
        dto.supplierId as unknown as SupplierId,
        dto.branchId as unknown as BranchId,
        user.id as unknown as UserId,
        dto.supplierInvoiceNumber ?? null,
        dto.supplierInvoiceDate ?? null,
      ),
    );

    return { id };
  }

  @Get(':id')
  @CheckAbility((ab) => ab.can('read', 'Receipt'))
  @ApiOperation({ summary: 'Детали прихода' })
  @ApiOkResponse({ description: 'Приход по ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ReceiptDetailReadModel> {
    return this.queryBus.execute(new GetReceiptByIdQuery(id));
  }

  @Patch(':id')
  @CheckAbility((ab) => ab.can('update', 'Receipt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Обновить строки прихода (только DRAFT)' })
  @ApiNoContentResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReceiptRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateReceiptCommand(
        ReceiptId.from(id),
        dto.lines.map((l) => ({
          id: l.id,
          skuId: l.skuId as unknown as import('@det/shared-types').SkuId,
          packagingId: l.packagingId ?? null,
          packageQuantity: l.packageQuantity,
          baseQuantity: Quantity.of(l.baseQuantityAmount, l.baseQuantityUnit as UnitOfMeasure),
          unitCost: centsToMoney(l.unitCostCents),
          expiresAt: l.expiresAt ? DateTime.from(l.expiresAt) : null,
        })),
      ),
    );
  }

  @Post(':id/post')
  @CheckAbility((ab) => ab.can('post', 'Receipt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Провести приход' })
  @ApiNoContentResponse()
  async post(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new PostReceiptCommand(ReceiptId.from(id), user.id as unknown as UserId),
    );
  }

  @Post(':id/cancel')
  @CheckAbility((ab) => ab.can('cancel', 'Receipt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отменить приход' })
  @ApiNoContentResponse()
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReceiptRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(new CancelReceiptCommand(ReceiptId.from(id), dto.reason));
  }

  @Post(':id/attachments')
  @CheckAbility((ab) => ab.can('update', 'Receipt'))
  @ApiOperation({ summary: 'Загрузить файл накладной (multipart)' })
  uploadAttachment(): never {
    throw new HttpException('Загрузка файлов будет реализована позже', HttpStatus.NOT_IMPLEMENTED);
  }
}
