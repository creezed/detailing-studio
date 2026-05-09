export class RegisterOwnerCommand {
  constructor(
    public readonly email: string,
    public readonly phone: string,
    public readonly password: string,
    public readonly fullName: string,
  ) {}
}
