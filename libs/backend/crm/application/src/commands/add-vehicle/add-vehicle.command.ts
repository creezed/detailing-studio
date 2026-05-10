export class AddVehicleCommand {
  constructor(
    public readonly clientId: string,
    public readonly make: string,
    public readonly model: string,
    public readonly bodyType: string,
    public readonly licensePlate: string | null,
    public readonly vin: string | null,
    public readonly year: number | null,
    public readonly color: string | null,
    public readonly comment: string,
  ) {}
}
