import { Inject } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';

import { GetNormDeviationReportQuery } from './get-norm-deviation-report.query';
import { WORK_ORDER_READ_PORT } from '../../di/tokens';

import type { IWorkOrderReadPort } from '../../ports/work-order-read.port';
import type { NormDeviationReportItem } from '../../read-models/work-order.read-models';
import type { IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetNormDeviationReportQuery)
export class GetNormDeviationReportHandler implements IQueryHandler<
  GetNormDeviationReportQuery,
  readonly NormDeviationReportItem[]
> {
  constructor(@Inject(WORK_ORDER_READ_PORT) private readonly readPort: IWorkOrderReadPort) {}

  execute(query: GetNormDeviationReportQuery): Promise<readonly NormDeviationReportItem[]> {
    return this.readPort.getNormDeviationReport({
      branchId: query.branchId,
      dateRange: query.dateRange,
      masterId: query.masterId,
    });
  }
}
