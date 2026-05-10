import { z } from 'zod/v4';

export const AppointmentConfirmedSchema = z.object({
  appointmentId: z.string(),
  clientId: z.string(),
  vehicleId: z.string().nullable(),
  branchId: z.string(),
  masterId: z.string(),
  scheduledAt: z.string(),
  services: z.array(
    z.object({
      serviceId: z.string(),
      name: z.string(),
      priceCents: z.number(),
    }),
  ),
});

export type AppointmentConfirmedPayload = z.infer<typeof AppointmentConfirmedSchema>;

export const APPOINTMENT_CONFIRMED_TYPE = 'AppointmentConfirmed';

export const AppointmentRescheduledSchema = z.object({
  appointmentId: z.string(),
  newScheduledAt: z.string(),
});

export type AppointmentRescheduledPayload = z.infer<typeof AppointmentRescheduledSchema>;

export const APPOINTMENT_RESCHEDULED_TYPE = 'AppointmentRescheduled';

export const AppointmentCancelledSchema = z.object({
  appointmentId: z.string(),
  cancelledAt: z.string(),
});

export type AppointmentCancelledPayload = z.infer<typeof AppointmentCancelledSchema>;

export const APPOINTMENT_CANCELLED_TYPE = 'AppointmentCancelled';

export const AppointmentNoShowedSchema = z.object({
  appointmentId: z.string(),
});

export type AppointmentNoShowedPayload = z.infer<typeof AppointmentNoShowedSchema>;

export const APPOINTMENT_NO_SHOWED_TYPE = 'AppointmentNoShowed';
