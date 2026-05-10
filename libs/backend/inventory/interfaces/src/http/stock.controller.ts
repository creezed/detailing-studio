import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  GetLowStockReportQuery,
  GetStockByBranchQuery,
  GetStockOnDateQuery,
  ListMovementsQuery,
} from '@det/backend-inventory-application';
import { CheckAbility } from '@det/backend-shared-auth';

import { LowStockQueryDto, MovementsListQueryDto, StockOnDateQueryDto } from '../dto/stock.dto';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('by-branch/:branchId')
  @CheckAbility((ab) => ab.can('read', 'Stock'))
  @ApiOperation({ summary: 'Остатки по филиалу' })
  @ApiOkResponse({ description: 'Список остатков по филиалу' })
  async byBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query() q: LowStockQueryDto,
  ): Promise<unknown> {
    return this.queryBus.execute(new GetStockByBranchQuery(branchId, q.offset, q.limit));
  }

  @Get('low')
  @CheckAbility((ab) => ab.can('read', 'Stock'))
  @ApiOperation({ summary: 'Отчёт «низкие остатки»' })
  @ApiOkResponse({ description: 'SKU ниже reorderLevel' })
  async lowStock(@Query() q: LowStockQueryDto): Promise<unknown> {
    return this.queryBus.execute(new GetLowStockReportQuery(q.offset, q.limit));
  }

  @Get('movements')
  @CheckAbility((ab) => ab.can('read', 'Stock'))
  @ApiOperation({ summary: 'Журнал движений' })
  @ApiOkResponse({ description: 'Постраничный журнал складских движений' })
  async movements(@Query() q: MovementsListQueryDto): Promise<unknown> {
    return this.queryBus.execute(
      new ListMovementsQuery(
        q.offset,
        q.limit,
        q.skuId,
        q.branchId,
        q.sourceType,
        q.fromDate,
        q.toDate,
      ),
    );
  }

  @Get('on-date')
  @CheckAbility((ab) => ab.can('read', 'Stock'))
  @ApiOperation({ summary: 'Остатки на дату' })
  @ApiOkResponse({ description: 'Снимок остатков на указанную дату' })
  async onDate(@Query() q: StockOnDateQueryDto): Promise<unknown> {
    return this.queryBus.execute(new GetStockOnDateQuery(q.branchId, q.date));
  }
}
