export class UpdateClientProfileCommand {
  constructor(
    public readonly clientId: string,
    public readonly lastName?: string,
    public readonly firstName?: string,
    public readonly middleName?: string | null,
    public readonly phone?: string,
    public readonly email?: string | null,
    public readonly birthDate?: string | null,
    public readonly source?: string | null,
    public readonly comment?: string,
  ) {}
}
