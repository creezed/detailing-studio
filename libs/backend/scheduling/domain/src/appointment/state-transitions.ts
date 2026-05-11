import { AppointmentStatus } from '../value-objects/appointment-status';

export const ALLOWED_TRANSITIONS: Readonly<
  Record<AppointmentStatus, readonly AppointmentStatus[]>
> = {
  [AppointmentStatus.PENDING_CONFIRMATION]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
