export interface SchedulingAppointmentReadModel {
  readonly id: string;
  readonly slotStart: string;
  readonly slotEnd: string;
  readonly status: string;
}

export interface ISchedulingAppointmentPort {
  getById(appointmentId: string): Promise<SchedulingAppointmentReadModel | null>;
  listByMasterAndDay(
    masterId: string,
    date: string,
  ): Promise<readonly SchedulingAppointmentReadModel[]>;
}
