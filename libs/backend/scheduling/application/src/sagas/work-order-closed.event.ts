import type { AppointmentId } from '@det/backend-scheduling-domain';
import { DomainEvent } from '@det/backend-shared-ddd';

export class WorkOrderClosedIntegrationEvent extends DomainEvent {
  readonly eventType = 'WorkOrderClosed';

  constructor(
    public readonly workOrderId: string,
    public readonly appointmentId: AppointmentId,
    public readonly closedAt: string,
  ) {
    super({
      aggregateId: workOrderId,
      aggregateType: 'WorkOrder',
      eventId: `WorkOrderClosed:${workOrderId}:${closedAt}`,
      occurredAt: new Date(closedAt),
    });
  }
}
