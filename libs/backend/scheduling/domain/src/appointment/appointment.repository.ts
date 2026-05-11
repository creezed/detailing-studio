import type { Appointment } from './appointment.aggregate';
import type { AppointmentId } from '../value-objects/appointment-id';
import type { AppointmentStatus } from '../value-objects/appointment-status';
import type { BayId } from '../value-objects/bay-id';
import type { BranchId } from '../value-objects/branch-id';
import type { MasterId } from '../value-objects/master-id';
import type { TimeSlot } from '../value-objects/time-slot.value-object';

export interface AppointmentListFilter {
  readonly branchId?: BranchId;
  readonly masterId?: MasterId;
  readonly clientId?: string;
  readonly status?: AppointmentStatus;
  readonly from?: Date;
  readonly to?: Date;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface AppointmentDateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface AppointmentListResult {
  readonly items: readonly Appointment[];
  readonly nextCursor: string | null;
}

export interface IAppointmentRepository {
  findById(id: AppointmentId): Promise<Appointment | null>;
  save(appointment: Appointment): Promise<void>;
  findOverlappingForMaster(
    masterId: MasterId,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]>;
  findOverlappingForBay(
    bayId: BayId,
    slot: TimeSlot,
    excludeAppointmentId?: AppointmentId,
  ): Promise<readonly Appointment[]>;
  listByFilter(filter: AppointmentListFilter): Promise<AppointmentListResult>;
  findByClient(clientId: string, limit: number, cursor?: string): Promise<AppointmentListResult>;
  findByMasterAndDay(masterId: MasterId, date: string): Promise<readonly Appointment[]>;
  findActiveByBranch(
    branchId: BranchId,
    dateRange: AppointmentDateRange,
  ): Promise<readonly Appointment[]>;
}
