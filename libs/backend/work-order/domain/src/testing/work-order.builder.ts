import { DateTime, Money, Quantity, UnitOfMeasure } from '@det/backend-shared-ddd';

import { FakeIdGenerator } from './fake-id-generator';
import { WorkOrder } from '../work-order/work-order.aggregate';

import type { MaterialNormSnapshot } from '../value-objects/material-norm-snapshot';
import type { WorkOrderServiceSnapshot } from '../value-objects/work-order-service-snapshot';
import type { OpenFromAppointmentProps } from '../work-order/work-order.aggregate';

const DEFAULT_APPOINTMENT_ID = '00000000-0000-4000-a000-aaa000000001';
const DEFAULT_BRANCH_ID = '00000000-0000-4000-a000-bbb000000001';
const DEFAULT_MASTER_ID = '00000000-0000-4000-a000-ccc000000001';
const DEFAULT_CLIENT_ID = '00000000-0000-4000-a000-ddd000000001';
const DEFAULT_VEHICLE_ID = '00000000-0000-4000-a000-eee000000001';

function defaultServices(): WorkOrderServiceSnapshot[] {
  return [
    {
      serviceId: '00000000-0000-4000-a000-fff000000001',
      serviceNameSnapshot: 'Полировка кузова',
      durationMinutes: 60,
      priceSnapshot: Money.rub(5000),
    },
  ];
}

function defaultNorms(): MaterialNormSnapshot[] {
  return [
    {
      skuId: '00000000-0000-4000-a000-111000000001',
      skuNameSnapshot: 'Полировальная паста',
      normAmount: Quantity.of(100, UnitOfMeasure.ML),
    },
    {
      skuId: '00000000-0000-4000-a000-111000000002',
      skuNameSnapshot: 'Микрофибра',
      normAmount: Quantity.of(2, UnitOfMeasure.PCS),
    },
  ];
}

export class WorkOrderBuilder {
  private _appointmentId = DEFAULT_APPOINTMENT_ID;
  private _branchId = DEFAULT_BRANCH_ID;
  private _masterId = DEFAULT_MASTER_ID;
  private _clientId = DEFAULT_CLIENT_ID;
  private _vehicleId = DEFAULT_VEHICLE_ID;
  private _services: WorkOrderServiceSnapshot[] = defaultServices();
  private _norms: MaterialNormSnapshot[] = defaultNorms();
  private _openedAt = DateTime.from('2024-06-15T09:00:00Z');
  private _idGen = new FakeIdGenerator();

  withAppointmentId(id: string): this {
    this._appointmentId = id;
    return this;
  }

  withBranchId(id: string): this {
    this._branchId = id;
    return this;
  }

  withMasterId(id: string): this {
    this._masterId = id;
    return this;
  }

  withClientId(id: string): this {
    this._clientId = id;
    return this;
  }

  withVehicleId(id: string): this {
    this._vehicleId = id;
    return this;
  }

  withServices(services: WorkOrderServiceSnapshot[]): this {
    this._services = services;
    return this;
  }

  withNorms(norms: MaterialNormSnapshot[]): this {
    this._norms = norms;
    return this;
  }

  withOpenedAt(openedAt: DateTime): this {
    this._openedAt = openedAt;
    return this;
  }

  withIdGen(idGen: FakeIdGenerator): this {
    this._idGen = idGen;
    return this;
  }

  build(): WorkOrder {
    const props: OpenFromAppointmentProps = {
      appointmentId: this._appointmentId,
      branchId: this._branchId,
      masterId: this._masterId,
      clientId: this._clientId,
      vehicleId: this._vehicleId,
      services: this._services,
      norms: this._norms,
      openedAt: this._openedAt,
      idGen: this._idGen,
    };
    return WorkOrder.openFromAppointment(props);
  }
}
