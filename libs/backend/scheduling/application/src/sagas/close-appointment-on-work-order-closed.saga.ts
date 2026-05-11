import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import { DateTime } from '@det/backend-shared-ddd';

import { WorkOrderClosedIntegrationEvent } from './work-order-closed.event';
import { CompleteAppointmentCommand } from '../commands/complete-appointment/complete-appointment.command';

@EventsHandler(WorkOrderClosedIntegrationEvent)
export class CloseAppointmentOnWorkOrderClosedSaga implements IEventHandler<WorkOrderClosedIntegrationEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: WorkOrderClosedIntegrationEvent): Promise<void> {
    await this.commandBus.execute(
      new CompleteAppointmentCommand(event.appointmentId, DateTime.from(event.closedAt)),
    );
  }
}
