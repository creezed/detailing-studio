import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  CreateTransferCommand,
  ListTransfersQuery,
  PostTransferCommand,
  TransferId,
} from '@det/backend-inventory-application';
import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { Quantity } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import {
  CreateTransferRequestDto,
  TransferCreatedResponseDto,
  TransferListQueryDto,
} from '../dto/transfer.dto';

@ApiTags('transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'Transfer'))
  @ApiOperation({ summary: 'Список перемещений' })
  @ApiOkResponse({ description: 'Постраничный список перемещений' })
  async list(@Query() q: TransferListQueryDto): Promise<unknown> {
    return this.queryBus.execute(new ListTransfersQuery(q.offset, q.limit, q.branchId, q.status));
  }

  @Post()
  @CheckAbility((ab) => ab.can('create', 'Transfer'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать перемещение' })
  @ApiCreatedResponse({ type: TransferCreatedResponseDto })
  async create(
    @Body() dto: CreateTransferRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TransferCreatedResponseDto> {
    const id = await this.commandBus.execute<CreateTransferCommand, TransferId>(
      new CreateTransferCommand(
        dto.fromBranchId as unknown as BranchId,
        dto.toBranchId as unknown as BranchId,
        dto.lines.map((l) => ({
          skuId: l.skuId as unknown as SkuId,
          quantity: Quantity.of(l.quantityAmount, l.quantityUnit as UnitOfMeasure),
        })),
        user.id as unknown as UserId,
      ),
    );

    return { id };
  }

  @Post(':id/post')
  @CheckAbility((ab) => ab.can('post', 'Transfer'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Провести перемещение' })
  @ApiNoContentResponse()
  async post(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new PostTransferCommand(TransferId.from(id), user.id as unknown as UserId),
    );
  }
}
