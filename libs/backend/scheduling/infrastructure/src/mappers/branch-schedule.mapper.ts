import { BranchSchedule } from '@det/backend-scheduling-domain';

import {
  deserializeScheduleException,
  deserializeWeeklyPattern,
  serializeScheduleExceptions,
  serializeWeeklyPattern,
} from './scheduling-json.mapper';
import { BranchScheduleExceptionSchema } from '../persistence/branch-schedule-exception.schema';
import { BranchScheduleSchema } from '../persistence/branch-schedule.schema';

export function mapBranchScheduleToDomain(schema: BranchScheduleSchema): BranchSchedule {
  return BranchSchedule.restore({
    branchId: schema.branchId,
    exceptions: schema.exceptions.getItems().map((exception) =>
      deserializeScheduleException({
        customRange: exception.customRange,
        date: exception.date,
        isClosed: exception.isClosed,
        reason: exception.reason,
      }),
    ),
    id: schema.id,
    weeklyPattern: deserializeWeeklyPattern(schema.weeklyPattern),
  });
}

export function mapBranchScheduleToPersistence(
  schedule: BranchSchedule,
  existing: BranchScheduleSchema | null,
): BranchScheduleSchema {
  const schema = existing ?? new BranchScheduleSchema();
  const snapshot = schedule.toSnapshot();

  schema.branchId = snapshot.branchId;
  schema.id = snapshot.id;
  schema.weeklyPattern = serializeWeeklyPattern(snapshot.weeklyPattern);
  schema.exceptions.removeAll();

  for (const exception of serializeScheduleExceptions(snapshot.exceptions)) {
    const item = new BranchScheduleExceptionSchema();
    item.customRange = exception.customRange;
    item.date = exception.date;
    item.isClosed = exception.isClosed;
    item.reason = exception.reason;
    item.schedule = schema;
    schema.exceptions.add(item);
  }

  return schema;
}
