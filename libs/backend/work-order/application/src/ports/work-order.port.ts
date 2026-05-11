import type {
  CursorPaginatedResult,
  WorkOrderDetailReadModel,
  WorkOrderListItemReadModel,
} from '../read-models/work-order.read-models';

export interface IWorkOrderPort {
  getById(workOrderId: string): Promise<WorkOrderDetailReadModel | null>;
  listByClient(
    clientId: string,
    limit: number,
    cursor?: string,
  ): Promise<CursorPaginatedResult<WorkOrderListItemReadModel>>;
  getByAppointmentId(appointmentId: string): Promise<WorkOrderDetailReadModel | null>;
}
