export class ListClientsQuery {
  constructor(
    public readonly page: number,
    public readonly pageSize: number,
    public readonly fullName?: string,
    public readonly phone?: string,
    public readonly licensePlate?: string,
    public readonly type?: string,
  ) {}
}
