import { DomainError } from '@det/backend-shared-ddd';

export class WorkOrderNotFoundError extends DomainError {
  readonly code = 'WORK_ORDER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(public readonly workOrderId: string) {
    super(`Work order ${workOrderId} not found`);
  }
}
