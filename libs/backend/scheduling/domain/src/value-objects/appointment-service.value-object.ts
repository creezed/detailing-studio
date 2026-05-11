import type { Money } from '@det/backend-shared-ddd';

import type { AppointmentServiceId } from './appointment-service-id';

export interface AppointmentService {
  readonly id: AppointmentServiceId;
  readonly serviceId: string;
  readonly serviceNameSnapshot: string;
  readonly durationMinutesSnapshot: number;
  readonly priceSnapshot: Money;
}
