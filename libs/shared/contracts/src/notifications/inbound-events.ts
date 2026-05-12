export interface UserRegisteredEvent {
  readonly eventId: string;
  readonly userId: string;
  readonly fullName: string;
  readonly email: string;
}

export interface InvitationIssuedEvent {
  readonly eventId: string;
  readonly email: string;
  readonly invitationUrl: string;
  readonly expiresAt: string;
}

export interface LowStockReachedEvent {
  readonly eventId: string;
  readonly skuId: string;
  readonly skuName: string;
  readonly branchId: string;
  readonly branchName: string;
  readonly currentQty: number;
  readonly reorderLevel: number;
}

export interface AppointmentConfirmedEvent {
  readonly eventId: string;
  readonly appointmentId: string;
  readonly clientId: string;
  readonly datetime: string;
  readonly serviceList: string;
  readonly branchAddress: string;
  readonly cancellationUrl: string;
}

export interface AppointmentCancelledEvent {
  readonly eventId: string;
  readonly appointmentId: string;
  readonly clientId: string;
  readonly reason: string;
}

export interface AppointmentRescheduledEvent {
  readonly eventId: string;
  readonly appointmentId: string;
  readonly clientId: string;
  readonly newDatetime: string;
  readonly serviceList: string;
  readonly branchAddress: string;
}

export interface CancellationRequestCreatedEvent {
  readonly eventId: string;
  readonly appointmentId: string;
  readonly clientId: string;
  readonly branchId: string;
  readonly reason: string;
}

export interface WorkOrderClosedEvent {
  readonly eventId: string;
  readonly workOrderId: string;
  readonly clientId: string;
  readonly serviceList: string;
  readonly clientCabinetUrl: string;
}
