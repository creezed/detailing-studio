import type {
  IWorkOrderRepository,
  WorkOrder,
  WorkOrderId,
  WorkOrderListResult,
} from '@det/backend-work-order-domain';

export class InMemoryWorkOrderRepository implements IWorkOrderRepository {
  private readonly _store = new Map<string, WorkOrder>();

  findById(id: WorkOrderId): Promise<WorkOrder | null> {
    return Promise.resolve(this._store.get(id) ?? null);
  }

  findByAppointmentId(appointmentId: string): Promise<WorkOrder | null> {
    for (const wo of this._store.values()) {
      if (wo.appointmentId === appointmentId) {
        return Promise.resolve(wo);
      }
    }
    return Promise.resolve(null);
  }

  save(workOrder: WorkOrder): Promise<void> {
    workOrder.pullDomainEvents();
    this._store.set(workOrder.id, workOrder);
    return Promise.resolve();
  }

  listByFilter(): Promise<WorkOrderListResult> {
    return Promise.resolve({ items: [...this._store.values()], nextCursor: null });
  }

  listByMaster(masterId: string): Promise<readonly WorkOrder[]> {
    return Promise.resolve(
      [...this._store.values()].filter((wo) => wo.toSnapshot().masterId === masterId),
    );
  }

  listOpenByBranch(): Promise<readonly WorkOrder[]> {
    return Promise.resolve([...this._store.values()]);
  }

  get size(): number {
    return this._store.size;
  }
}
