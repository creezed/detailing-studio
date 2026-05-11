import { MasterSchedule } from '@det/backend-scheduling-domain';

import {
  deserializeUnavailability,
  deserializeWeeklyPattern,
  serializeUnavailabilities,
  serializeWeeklyPattern,
} from './scheduling-json.mapper';
import { MasterScheduleSchema } from '../persistence/master-schedule.schema';
import { MasterUnavailabilitySchema } from '../persistence/master-unavailability.schema';

export function mapMasterScheduleToDomain(schema: MasterScheduleSchema): MasterSchedule {
  return MasterSchedule.restore({
    branchId: schema.branchId,
    id: schema.id,
    masterId: schema.masterId,
    unavailabilities: schema.unavailabilities.getItems().map((unavailability) =>
      deserializeUnavailability({
        fromAt: unavailability.fromAt.toISOString(),
        id: unavailability.id,
        reason: unavailability.reason,
        toAt: unavailability.toAt.toISOString(),
      }),
    ),
    weeklyPattern: deserializeWeeklyPattern(schema.weeklyPattern),
  });
}

export function mapMasterScheduleToPersistence(
  schedule: MasterSchedule,
  existing: MasterScheduleSchema | null,
): MasterScheduleSchema {
  const schema = existing ?? new MasterScheduleSchema();
  const snapshot = schedule.toSnapshot();

  schema.branchId = snapshot.branchId;
  schema.id = snapshot.id;
  schema.masterId = snapshot.masterId;
  schema.weeklyPattern = serializeWeeklyPattern(snapshot.weeklyPattern);
  schema.unavailabilities.removeAll();

  for (const unavailability of serializeUnavailabilities(snapshot.unavailabilities)) {
    const item = new MasterUnavailabilitySchema();
    item.fromAt = new Date(unavailability.fromAt);
    item.id = unavailability.id;
    item.reason = unavailability.reason;
    item.schedule = schema;
    item.toAt = new Date(unavailability.toAt);
    schema.unavailabilities.add(item);
  }

  return schema;
}
