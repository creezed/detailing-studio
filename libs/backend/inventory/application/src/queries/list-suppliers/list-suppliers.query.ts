export class ListSuppliersQuery {
  constructor(
    public readonly offset: number,
    public readonly limit: number,
    public readonly isActive?: boolean,
    public readonly search?: string,
  ) {}
}
