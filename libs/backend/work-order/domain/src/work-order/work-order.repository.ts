import type { WorkOrder } from './work-order.aggregate';
import type { WorkOrderId } from '../value-objects/work-order-id';
import type { WorkOrderStatus } from '../value-objects/work-order-status';

export interface WorkOrderListFilter {
  readonly branchId?: string;
  readonly masterId?: string;
  readonly status?: WorkOrderStatus;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface WorkOrderListResult {
  readonly items: readonly WorkOrder[];
  readonly nextCursor: string | null;
}

export interface IWorkOrderRepository {
  findById(id: WorkOrderId): Promise<WorkOrder | null>;
  findByAppointmentId(appointmentId: string): Promise<WorkOrder | null>;
  save(workOrder: WorkOrder): Promise<void>;
  listByFilter(filter: WorkOrderListFilter): Promise<WorkOrderListResult>;
  listByMaster(masterId: string, status?: WorkOrderStatus): Promise<readonly WorkOrder[]>;
  listOpenByBranch(branchId: string): Promise<readonly WorkOrder[]>;
}
