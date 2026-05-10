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
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import {
  CancelStockTakingCommand,
  GetStockTakingByIdQuery,
  ListStockTakingsQuery,
  PostStockTakingCommand,
  RecordStockTakingMeasurementCommand,
  StartStockTakingCommand,
  StockTakingId,
} from '@det/backend-inventory-application';
import type { StockTakingDetailReadModel } from '@det/backend-inventory-application';
import { CheckAbility, CurrentUser } from '@det/backend-shared-auth';
import type { AuthenticatedUser } from '@det/backend-shared-auth';
import { Quantity } from '@det/backend-shared-ddd';
import type { UnitOfMeasure } from '@det/backend-shared-ddd';
import type { BranchId, SkuId, UserId } from '@det/shared-types';

import {
  RecordMeasurementsRequestDto,
  StartStockTakingRequestDto,
  StockTakingCreatedResponseDto,
  StockTakingListQueryDto,
} from '../dto/stock-taking.dto';

@ApiTags('stock-takings')
@ApiBearerAuth()
@Controller('stock-takings')
export class StockTakingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @CheckAbility((ab) => ab.can('read', 'StockTaking'))
  @ApiOperation({ summary: 'Список инвентаризаций' })
  @ApiOkResponse({ description: 'Постраничный список инвентаризаций' })
  async list(@Query() q: StockTakingListQueryDto): Promise<unknown> {
    return this.queryBus.execute(
      new ListStockTakingsQuery(q.offset, q.limit, q.branchId, q.status),
    );
  }

  @Post()
  @CheckAbility((ab) => ab.can('create', 'StockTaking'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Начать инвентаризацию' })
  @ApiCreatedResponse({ type: StockTakingCreatedResponseDto })
  async start(
    @Body() dto: StartStockTakingRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StockTakingCreatedResponseDto> {
    const { id } = await this.commandBus.execute<StartStockTakingCommand, { id: StockTakingId }>(
      new StartStockTakingCommand(
        dto.branchId as unknown as BranchId,
        user.id as unknown as UserId,
      ),
    );

    return { id };
  }

  @Get(':id')
  @CheckAbility((ab) => ab.can('read', 'StockTaking'))
  @ApiOperation({ summary: 'Детали инвентаризации' })
  @ApiOkResponse({ description: 'Инвентаризация по ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<StockTakingDetailReadModel> {
    return this.queryBus.execute(new GetStockTakingByIdQuery(id));
  }

  @Patch(':id/measurements')
  @CheckAbility((ab) => ab.can('update', 'StockTaking'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ввести фактические количества' })
  @ApiNoContentResponse()
  async recordMeasurements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordMeasurementsRequestDto,
  ): Promise<void> {
    for (const m of dto.measurements) {
      await this.commandBus.execute(
        new RecordStockTakingMeasurementCommand(
          StockTakingId.from(id),
          m.skuId as unknown as SkuId,
          Quantity.of(m.actualAmount, m.actualUnit as UnitOfMeasure),
        ),
      );
    }
  }

  @Post(':id/post')
  @CheckAbility((ab) => ab.can('post', 'StockTaking'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Провести инвентаризацию' })
  @ApiNoContentResponse()
  async post(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new PostStockTakingCommand(StockTakingId.from(id), user.id as unknown as UserId),
    );
  }

  @Post(':id/cancel')
  @CheckAbility((ab) => ab.can('cancel', 'StockTaking'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отменить инвентаризацию' })
  @ApiNoContentResponse()
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new CancelStockTakingCommand(StockTakingId.from(id)));
  }

  @Get(':id/sheet.pdf')
  @CheckAbility((ab) => ab.can('read', 'StockTaking'))
  @ApiOperation({ summary: 'Скачать инвентаризационную ведомость (PDF)' })
  @ApiProduces('application/pdf')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  downloadSheet(@Param('id', ParseUUIDPipe) _id: string): never {
    throw new HttpException('Генерация PDF будет реализована позже', HttpStatus.NOT_IMPLEMENTED);
  }
}
