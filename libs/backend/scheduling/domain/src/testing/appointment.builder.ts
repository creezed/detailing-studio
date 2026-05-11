import { DateTime, Money } from '@det/backend-shared-ddd';

import { FakeIdGenerator } from './fake-id-generator';
import { Appointment } from '../appointment/appointment.aggregate';
import { AppointmentServiceId } from '../value-objects/appointment-service-id';
import { CreationChannel } from '../value-objects/creation-channel';
import { TimeSlot } from '../value-objects/time-slot.value-object';
import { Timezone } from '../value-objects/timezone.value-object';

import type { CreateAppointmentProps } from '../appointment/appointment.aggregate';
import type { AppointmentService } from '../value-objects/appointment-service.value-object';

const DEFAULT_CLIENT_ID = '00000000-0000-4000-a000-000000000020';
const DEFAULT_VEHICLE_ID = '00000000-0000-4000-a000-000000000030';
const DEFAULT_BRANCH_ID = '00000000-0000-4000-a000-000000000099';
const DEFAULT_MASTER_ID = '00000000-0000-4000-a000-000000000010';
const DEFAULT_CREATED_BY = '00000000-0000-4000-a000-000000000040';

function defaultServices(): AppointmentService[] {
  return [
    {
      id: AppointmentServiceId.from('00000000-0000-4000-a000-000000000050'),
      serviceId: '00000000-0000-4000-a000-000000000060',
      serviceNameSnapshot: 'Полировка кузова',
      durationMinutesSnapshot: 60,
      priceSnapshot: Money.rub(5000),
    },
  ];
}

function defaultSlot(): TimeSlot {
  return TimeSlot.from(
    DateTime.from('2024-02-15T09:00:00Z'),
    DateTime.from('2024-02-15T10:30:00Z'),
    Timezone.from('Europe/Moscow'),
  );
}

export class AppointmentBuilder {
  private _clientId = DEFAULT_CLIENT_ID;
  private _vehicleId = DEFAULT_VEHICLE_ID;
  private _branchId = DEFAULT_BRANCH_ID;
  private _bayId: string | null = null;
  private _masterId = DEFAULT_MASTER_ID;
  private _services: AppointmentService[] = defaultServices();
  private _slot: TimeSlot = defaultSlot();
  private _createdBy = DEFAULT_CREATED_BY;
  private _createdVia: CreationChannel = CreationChannel.MANAGER;
  private _idGen = new FakeIdGenerator();
  private _now = DateTime.from('2024-02-15T08:00:00Z');

  withClientId(clientId: string): this {
    this._clientId = clientId;
    return this;
  }

  withVehicleId(vehicleId: string): this {
    this._vehicleId = vehicleId;
    return this;
  }

  withBranchId(branchId: string): this {
    this._branchId = branchId;
    return this;
  }

  withBayId(bayId: string | null): this {
    this._bayId = bayId;
    return this;
  }

  withMasterId(masterId: string): this {
    this._masterId = masterId;
    return this;
  }

  withServices(services: AppointmentService[]): this {
    this._services = services;
    return this;
  }

  withSlot(slot: TimeSlot): this {
    this._slot = slot;
    return this;
  }

  withCreatedBy(createdBy: string): this {
    this._createdBy = createdBy;
    return this;
  }

  withCreatedVia(createdVia: CreationChannel): this {
    this._createdVia = createdVia;
    return this;
  }

  withIdGen(idGen: FakeIdGenerator): this {
    this._idGen = idGen;
    return this;
  }

  withNow(now: DateTime): this {
    this._now = now;
    return this;
  }

  build(): Appointment {
    const props: CreateAppointmentProps = {
      clientId: this._clientId,
      vehicleId: this._vehicleId,
      branchId: this._branchId,
      bayId: this._bayId,
      masterId: this._masterId,
      services: this._services,
      slot: this._slot,
      createdBy: this._createdBy,
      createdVia: this._createdVia,
      idGen: this._idGen,
      now: this._now,
    };
    return Appointment.create(props);
  }
}
