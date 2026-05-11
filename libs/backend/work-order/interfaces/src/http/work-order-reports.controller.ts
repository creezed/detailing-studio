import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CheckAbility } from '@det/backend-shared-auth';
import { GetNormDeviationReportQuery } from '@det/backend-work-order-application';
import type { NormDeviationReportItem } from '@det/backend-work-order-application';

import { NormDeviationReportQueryDto } from '../dto/work-order.dto';

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders/reports')
export class WorkOrderReportsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('norm-deviation')
  @CheckAbility(
    (ab, ctx) => ctx.user.role === 'OWNER' && ab.can('read-norm-deviation-report', 'WorkOrder'),
  )
  @ApiOperation({ summary: 'Отчёт по отклонениям расхода от нормы (только OWNER)' })
  @ApiOkResponse({ description: 'Список строк с отклонениями' })
  async normDeviation(
    @Query() q: NormDeviationReportQueryDto,
  ): Promise<readonly NormDeviationReportItem[]> {
    return this.queryBus.execute(
      new GetNormDeviationReportQuery({ from: q.dateFrom, to: q.dateTo }, q.branchId, q.masterId),
    );
  }
}
