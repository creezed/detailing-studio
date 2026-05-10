export class DeactivateVehicleCommand {
  constructor(
    public readonly clientId: string,
    public readonly vehicleId: string,
  ) {}
}
