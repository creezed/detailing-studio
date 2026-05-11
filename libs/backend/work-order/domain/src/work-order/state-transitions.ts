import { WorkOrderStatus } from '../value-objects/work-order-status';

export const ALLOWED_TRANSITIONS: Readonly<Record<WorkOrderStatus, readonly WorkOrderStatus[]>> = {
  [WorkOrderStatus.OPEN]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.AWAITING_REVIEW, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.AWAITING_REVIEW]: [
    WorkOrderStatus.CLOSING,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.CLOSING]: [WorkOrderStatus.CLOSED, WorkOrderStatus.IN_PROGRESS],
  [WorkOrderStatus.CLOSED]: [WorkOrderStatus.IN_PROGRESS],
  [WorkOrderStatus.CANCELLED]: [],
};

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
