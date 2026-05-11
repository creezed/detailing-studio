export interface CrmVehicleReadModel {
  readonly id: string;
  readonly make: string;
  readonly model: string;
  readonly licensePlate: string;
}

export interface ICrmVehiclePort {
  getById(vehicleId: string): Promise<CrmVehicleReadModel | null>;
}
