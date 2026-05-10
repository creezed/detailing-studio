import { z } from 'zod/v4';

export const WorkOrderOpenedSchema = z.object({
  workOrderId: z.string(),
  appointmentId: z.string(),
  startedAt: z.string(),
});

export type WorkOrderOpenedPayload = z.infer<typeof WorkOrderOpenedSchema>;

export const WORK_ORDER_OPENED_TYPE = 'WorkOrderOpened';

export const WorkOrderClosedSchema = z.object({
  workOrderId: z.string(),
  appointmentId: z.string(),
  completedAt: z.string(),
  totalAmountCents: z.number().nullable(),
  materialsTotalCents: z.number().nullable(),
  photoCount: z.number(),
  beforePhotoUrls: z.array(z.string()).nullable(),
  afterPhotoUrls: z.array(z.string()).nullable(),
});

export type WorkOrderClosedPayload = z.infer<typeof WorkOrderClosedSchema>;

export const WORK_ORDER_CLOSED_TYPE = 'WorkOrderClosed';
