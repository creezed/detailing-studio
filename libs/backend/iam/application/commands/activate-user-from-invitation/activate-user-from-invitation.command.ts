export class ActivateUserFromInvitationCommand {
  constructor(
    public readonly rawToken: string,
    public readonly password: string,
    public readonly fullName: string,
    public readonly phone: string,
  ) {}
}
