import { DomainEvent } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';

import type { SupplierId } from './supplier-id';

const SUPPLIER_AGGREGATE_TYPE = 'Supplier';

function supplierEventProps(supplierId: SupplierId, eventType: string, occurredAt: DateTime) {
  return {
    aggregateId: supplierId,
    aggregateType: SUPPLIER_AGGREGATE_TYPE,
    eventId: `${eventType}:${supplierId}:${occurredAt.iso()}`,
    occurredAt: occurredAt.toDate(),
  };
}

export class SupplierCreated extends DomainEvent {
  readonly eventType = 'SupplierCreated';

  constructor(
    public readonly supplierId: SupplierId,
    public readonly name: string,
    public readonly createdAt: DateTime,
  ) {
    super(supplierEventProps(supplierId, 'SupplierCreated', createdAt));
  }
}

export class SupplierContactUpdated extends DomainEvent {
  readonly eventType = 'SupplierContactUpdated';

  constructor(
    public readonly supplierId: SupplierId,
    public readonly updatedAt: DateTime,
  ) {
    super(supplierEventProps(supplierId, 'SupplierContactUpdated', updatedAt));
  }
}

export class SupplierDeactivated extends DomainEvent {
  readonly eventType = 'SupplierDeactivated';

  constructor(
    public readonly supplierId: SupplierId,
    public readonly deactivatedAt: DateTime,
  ) {
    super(supplierEventProps(supplierId, 'SupplierDeactivated', deactivatedAt));
  }
}

export class SupplierReactivated extends DomainEvent {
  readonly eventType = 'SupplierReactivated';

  constructor(
    public readonly supplierId: SupplierId,
    public readonly reactivatedAt: DateTime,
  ) {
    super(supplierEventProps(supplierId, 'SupplierReactivated', reactivatedAt));
  }
}
