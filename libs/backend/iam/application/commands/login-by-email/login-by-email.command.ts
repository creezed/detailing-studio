export class LoginByEmailCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}
