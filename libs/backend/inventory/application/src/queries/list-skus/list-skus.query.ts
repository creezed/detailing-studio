export class ListSkusQuery {
  constructor(
    public readonly offset: number,
    public readonly limit: number,
    public readonly group?: string,
    public readonly isActive?: boolean,
    public readonly search?: string,
  ) {}
}
